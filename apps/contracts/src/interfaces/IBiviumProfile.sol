// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Id, MarketParams} from "./IBivium.sol";

/// @title IBiviumProfile
/// @notice Per-lender state and entry points. Storage lives in the lender's
///         EOA via EIP-7702 delegation. State-changing events are NOT emitted
///         from this contract; they are forwarded to the canonical
///         `BiviumEventEmitter` so the indexer only needs to follow one
///         address.
interface IBiviumProfile {
    // ── Errors ──
    error OnlySelf();
    error OnlyRouter();
    error ProfilePaused();
    error LoanTokenNotActive(address loanToken);
    error RateMismatch(uint256 marketRate, uint256 declaredRate);
    error CollateralNotAllowed(address collateralToken);
    error CollateralNotInList(address collateral);
    error NotYourMarket();
    error ZeroLoanAmount();
    error RateTooHigh();
    error ZeroAddress();
    error DuplicateCollateral(address collateral);

    // ── Views ──
    function BIVIUM() external view returns (address);
    function ROUTER() external view returns (address);
    function EMITTER() external view returns (address);

    function getRate(address loanToken) external view returns (uint256);
    function getAllowedCollaterals() external view returns (address[] memory);
    function isCollateralAllowed(address collateral) external view returns (bool);
    function paused() external view returns (bool);

    // ── Lender-only (onlySelf via 7702) ──
    function setRate(address loanToken, uint256 ratePerSecond) external;
    function setAllowedCollaterals(address[] calldata collaterals) external;
    function addAllowedCollateral(address collateral) external;
    function removeAllowedCollateral(address collateral) external;
    function pause() external;
    function unpause() external;
    function withdrawFromMarket(MarketParams calldata params, uint256 amount) external;

    // ── Router-only ──
    function fulfillBorrow(MarketParams calldata params, uint256 loanAmount) external;
}
