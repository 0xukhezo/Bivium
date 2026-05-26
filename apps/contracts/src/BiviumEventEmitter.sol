// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IBiviumEventEmitter} from "./interfaces/IBiviumEventEmitter.sol";

/// @title BiviumEventEmitter
/// @notice Single-address registry + event sink for the Bivium lender Profile.
///         Each `emit*` function is gated by an EXTCODEHASH check that only
///         passes for EOAs delegated to the canonical Profile template via
///         EIP-7702. This closes the permissionless spam vector while keeping
///         the indexer surface to a single contract address.
/// @dev Deploy / wire-up order:
///        1. `new BiviumEventEmitter()` — saves `DEPLOYER = msg.sender`.
///        2. Deploy the Profile template with this Emitter address.
///        3. `initialize(profileTemplate)` — locks in
///           `expectedProfileCodehash = keccak256(0xef0100 || profileTemplate)`.
///      Without step 3, every `emit*` reverts with `NotInitialized`.
contract BiviumEventEmitter is IBiviumEventEmitter {
    /// @inheritdoc IBiviumEventEmitter
    address public immutable DEPLOYER;

    /// @inheritdoc IBiviumEventEmitter
    address public profileTemplate;
    /// @inheritdoc IBiviumEventEmitter
    bytes32 public expectedProfileCodehash;
    /// @inheritdoc IBiviumEventEmitter
    bool public initialized;

    /// @inheritdoc IBiviumEventEmitter
    mapping(address => bool) public registered;

    constructor() {
        DEPLOYER = msg.sender;
    }

    /// @inheritdoc IBiviumEventEmitter
    function initialize(address profileTemplate_) external {
        if (msg.sender != DEPLOYER) revert OnlyDeployer();
        if (initialized) revert AlreadyInitialized();
        initialized = true;
        profileTemplate = profileTemplate_;
        bytes32 codehash = keccak256(abi.encodePacked(hex"ef0100", profileTemplate_));
        expectedProfileCodehash = codehash;
        emit Initialized(profileTemplate_, codehash);
    }

    /// @dev Reverts unless `msg.sender` is an EOA delegated via EIP-7702 to the
    ///      canonical Profile template. The EXTCODEHASH of such an EOA is
    ///      `keccak256(0xef0100 || profileTemplate)`.
    modifier onlyProfile() {
        if (!initialized) revert NotInitialized();
        if (msg.sender.codehash != expectedProfileCodehash) revert NotAProfile();
        _;
    }

    // ── Registry ──

    /// @inheritdoc IBiviumEventEmitter
    function emitRegister() external onlyProfile {
        if (!registered[msg.sender]) {
            registered[msg.sender] = true;
            emit LenderRegistered(msg.sender);
        }
    }

    // ── Profile state events ──

    /// @inheritdoc IBiviumEventEmitter
    function emitRateSet(address loanToken, uint256 ratePerSecond) external onlyProfile {
        emit RateSet(msg.sender, loanToken, ratePerSecond);
    }

    /// @inheritdoc IBiviumEventEmitter
    function emitAllowedCollateralsSet(address[] calldata collaterals) external onlyProfile {
        emit AllowedCollateralsSet(msg.sender, collaterals);
    }

    /// @inheritdoc IBiviumEventEmitter
    function emitAllowedCollateralAdded(address collateral) external onlyProfile {
        emit AllowedCollateralAdded(msg.sender, collateral);
    }

    /// @inheritdoc IBiviumEventEmitter
    function emitAllowedCollateralRemoved(address collateral) external onlyProfile {
        emit AllowedCollateralRemoved(msg.sender, collateral);
    }

    /// @inheritdoc IBiviumEventEmitter
    function emitPaused() external onlyProfile {
        emit Paused(msg.sender);
    }

    /// @inheritdoc IBiviumEventEmitter
    function emitUnpaused() external onlyProfile {
        emit Unpaused(msg.sender);
    }

    /// @inheritdoc IBiviumEventEmitter
    function emitMarketCreated(
        bytes32 id,
        address loanToken,
        address collateralToken,
        uint256 ratePerSecond
    ) external onlyProfile {
        emit MarketCreated(msg.sender, id, loanToken, collateralToken, ratePerSecond);
    }

    /// @inheritdoc IBiviumEventEmitter
    function emitFulfilledBorrow(bytes32 id, uint256 loanAmount) external onlyProfile {
        emit FulfilledBorrow(msg.sender, id, loanAmount);
    }

    /// @inheritdoc IBiviumEventEmitter
    function emitWithdrawnFromMarket(bytes32 id, uint256 assets) external onlyProfile {
        emit WithdrawnFromMarket(msg.sender, id, assets);
    }
}
