// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuardTransient} from "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";

import {Id, Market, MarketParams, CreateMarketInput, IBivium} from "./interfaces/IBivium.sol";
import {IBiviumEventEmitter} from "./interfaces/IBiviumEventEmitter.sol";
import {IBiviumProfile} from "./interfaces/IBiviumProfile.sol";
import {IERC20} from "./interfaces/IERC20.sol";
import {MAX_RATE_PER_SECOND} from "./libraries/ConstantsLib.sol";
import {MarketParamsLib} from "./libraries/MarketParamsLib.sol";
import {SafeTransferLib} from "./libraries/SafeTransferLib.sol";

/// @title BiviumProfile
/// @notice ERC-7702 delegate contract that each lender's EOA points to. Holds
///         the lender's per-loan-token rates, global collateral whitelist, the
///         pause switch, and the `fulfillBorrow` function the Router invokes
///         on every borrow.
/// @dev Storage uses ERC-7201 namespaced layout to:
///      - avoid collisions if a lender re-delegates the same EOA to another
///        contract,
///      - allow safe v2/v3 evolution by appending fields without shifting
///        existing slots.
///      The reentrancy guard slot is also namespaced via OZ's
///      `ReentrancyGuardTransient` (`openzeppelin.storage.ReentrancyGuard`).
///
///      State-changing events are forwarded to the shared `BiviumEventEmitter`
///      (gated by EXTCODEHASH so only EOAs delegated to this Profile template
///      can emit). The Profile itself emits nothing.
contract BiviumProfile is IBiviumProfile, ReentrancyGuardTransient {
    using MarketParamsLib for MarketParams;
    using SafeTransferLib for IERC20;

    /// @custom:storage-location erc7201:bivium.BiviumProfile
    struct BiviumProfileStorage {
        // Per loan token: rate at which the lender lends. `rate == 0` means
        // "this token is not active for me".
        mapping(address loanToken => uint256 ratePerSecond) rates;
        // Global list of accepted collaterals. Applies to every loan token.
        address[] allowedCollaterals;
        // O(1) membership check used by `fulfillBorrow`.
        mapping(address collateral => bool) isAllowedCollateral;
        // Global pause switch ("exit Bivium for any new borrow").
        bool paused;
    }

    // keccak256(abi.encode(uint256(keccak256("bivium.BiviumProfile")) - 1))
    //   & ~bytes32(uint256(0xff))
    bytes32 private constant _STORAGE_LOCATION =
        0x925d5aaaef69b0d07ee40aba75bbaf00303921136910000dc52bda3b3c6c8500;

    function _s() private pure returns (BiviumProfileStorage storage $) {
        bytes32 slot = _STORAGE_LOCATION;
        assembly {
            $.slot := slot
        }
    }

    address public immutable BIVIUM;
    address public immutable ROUTER;
    address public immutable EMITTER;

    constructor(address bivium_, address router_, address emitter_) {
        require(bivium_ != address(0), "zero bivium");
        require(router_ != address(0), "zero router");
        require(emitter_ != address(0), "zero emitter");
        BIVIUM = bivium_;
        ROUTER = router_;
        EMITTER = emitter_;
    }

    modifier onlySelf() {
        if (msg.sender != address(this)) revert OnlySelf();
        _;
    }

    // ── Lender-only ──

    function setRate(address loanToken, uint256 ratePerSecond) external onlySelf {
        if (ratePerSecond > MAX_RATE_PER_SECOND) revert RateTooHigh();
        _ensureRegistered();
        _s().rates[loanToken] = ratePerSecond;
        IBiviumEventEmitter(EMITTER).emitRateSet(loanToken, ratePerSecond);
    }

    function setAllowedCollaterals(address[] calldata collaterals) external onlySelf {
        _ensureRegistered();
        BiviumProfileStorage storage $ = _s();

        uint256 oldLen = $.allowedCollaterals.length;
        for (uint256 i; i < oldLen;) {
            $.isAllowedCollateral[$.allowedCollaterals[i]] = false;
            unchecked { ++i; }
        }
        delete $.allowedCollaterals;

        uint256 newLen = collaterals.length;
        for (uint256 i; i < newLen;) {
            address c = collaterals[i];
            if (c == address(0)) revert ZeroAddress();
            if ($.isAllowedCollateral[c]) revert DuplicateCollateral(c);
            $.isAllowedCollateral[c] = true;
            $.allowedCollaterals.push(c);
            unchecked { ++i; }
        }

        IBiviumEventEmitter(EMITTER).emitAllowedCollateralsSet(collaterals);
    }

    function addAllowedCollateral(address collateral) external onlySelf {
        if (collateral == address(0)) revert ZeroAddress();
        _ensureRegistered();
        BiviumProfileStorage storage $ = _s();
        if ($.isAllowedCollateral[collateral]) revert DuplicateCollateral(collateral);
        $.isAllowedCollateral[collateral] = true;
        $.allowedCollaterals.push(collateral);
        IBiviumEventEmitter(EMITTER).emitAllowedCollateralAdded(collateral);
    }

    function removeAllowedCollateral(address collateral) external onlySelf {
        BiviumProfileStorage storage $ = _s();
        if (!$.isAllowedCollateral[collateral]) revert CollateralNotInList(collateral);
        $.isAllowedCollateral[collateral] = false;

        uint256 len = $.allowedCollaterals.length;
        for (uint256 i; i < len;) {
            if ($.allowedCollaterals[i] == collateral) {
                if (i != len - 1) {
                    $.allowedCollaterals[i] = $.allowedCollaterals[len - 1];
                }
                $.allowedCollaterals.pop();
                break;
            }
            unchecked { ++i; }
        }

        IBiviumEventEmitter(EMITTER).emitAllowedCollateralRemoved(collateral);
    }

    function pause() external onlySelf {
        _s().paused = true;
        IBiviumEventEmitter(EMITTER).emitPaused();
    }

    function unpause() external onlySelf {
        _s().paused = false;
        IBiviumEventEmitter(EMITTER).emitUnpaused();
    }

    /// @notice Escape hatch to pull supplied loan tokens out of a market when
    ///         the auto-forward path in Bivium does not (or cannot) deliver
    ///         them back to the lender. Not part of the happy path.
    function withdrawFromMarket(MarketParams calldata params, uint256 amount) external onlySelf {
        IBivium(BIVIUM).withdraw(params, amount, 0, address(this), address(this));
        IBiviumEventEmitter(EMITTER).emitWithdrawnFromMarket(Id.unwrap(params.id()), amount);
    }

    // ── Router-only ──

    function fulfillBorrow(MarketParams calldata params, uint256 loanAmount) external nonReentrant {
        if (msg.sender != ROUTER) revert OnlyRouter();
        if (loanAmount == 0) revert ZeroLoanAmount();
        if (params.creator != address(this)) revert NotYourMarket();

        BiviumProfileStorage storage $ = _s();
        if ($.paused) revert ProfilePaused();

        uint256 declaredRate = $.rates[params.loanToken];
        if (declaredRate == 0) revert LoanTokenNotActive(params.loanToken);
        if (params.ratePerSecond != declaredRate) {
            revert RateMismatch(params.ratePerSecond, declaredRate);
        }
        if (!$.isAllowedCollateral[params.collateralToken]) {
            revert CollateralNotAllowed(params.collateralToken);
        }

        Id id = params.id();

        // Create the market on demand the first time we see this (loanToken,
        // collateralToken) pair under this lender. `lastUpdate == 0` is the
        // canonical "market does not exist yet" sentinel.
        Market memory m = IBivium(BIVIUM).market(id);
        if (m.lastUpdate == 0) {
            IBivium(BIVIUM).createMarket(CreateMarketInput({
                loanToken: params.loanToken,
                collateralToken: params.collateralToken,
                ratePerSecond: params.ratePerSecond,
                creator: address(this)
            }));
            IBiviumEventEmitter(EMITTER).emitMarketCreated(
                Id.unwrap(id),
                params.loanToken,
                params.collateralToken,
                params.ratePerSecond
            );
        }

        IERC20(params.loanToken).safeApprove(BIVIUM, loanAmount);
        IBivium(BIVIUM).supply(params, loanAmount, 0, address(this), "");
        IERC20(params.loanToken).safeApprove(BIVIUM, 0);

        IBiviumEventEmitter(EMITTER).emitFulfilledBorrow(Id.unwrap(id), loanAmount);
    }

    // ── Views ──

    function getRate(address loanToken) external view returns (uint256) {
        return _s().rates[loanToken];
    }

    function getAllowedCollaterals() external view returns (address[] memory) {
        return _s().allowedCollaterals;
    }

    function isCollateralAllowed(address collateral) external view returns (bool) {
        return _s().isAllowedCollateral[collateral];
    }

    function paused() external view returns (bool) {
        return _s().paused;
    }

    // ── Internal ──

    function _ensureRegistered() internal {
        if (!IBiviumEventEmitter(EMITTER).registered(address(this))) {
            IBiviumEventEmitter(EMITTER).emitRegister();
        }
    }
}
