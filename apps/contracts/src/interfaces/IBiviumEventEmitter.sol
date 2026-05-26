// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IBiviumEventEmitter
/// @notice Single-address sink for every state-changing Profile event in
///         Bivium. Each `emit*` function is callable only by an EOA that has
///         been delegated to the canonical BiviumProfile template via
///         EIP-7702 (enforced on-chain via EXTCODEHASH gating).
interface IBiviumEventEmitter {
    // ── Events ──
    event Initialized(address indexed profileTemplate, bytes32 expectedCodehash);
    event LenderRegistered(address indexed lender);
    event RateSet(address indexed lender, address indexed loanToken, uint256 ratePerSecond);
    event AllowedCollateralsSet(address indexed lender, address[] collaterals);
    event AllowedCollateralAdded(address indexed lender, address indexed collateral);
    event AllowedCollateralRemoved(address indexed lender, address indexed collateral);
    event Paused(address indexed lender);
    event Unpaused(address indexed lender);
    event MarketCreated(
        address indexed lender,
        bytes32 indexed id,
        address loanToken,
        address collateralToken,
        uint256 ratePerSecond
    );
    event FulfilledBorrow(address indexed lender, bytes32 indexed id, uint256 loanAmount);
    event WithdrawnFromMarket(address indexed lender, bytes32 indexed id, uint256 assets);

    // ── Errors ──
    error NotInitialized();
    error AlreadyInitialized();
    error OnlyDeployer();
    error NotAProfile();

    // ── Views ──
    function DEPLOYER() external view returns (address);
    function profileTemplate() external view returns (address);
    function expectedProfileCodehash() external view returns (bytes32);
    function initialized() external view returns (bool);
    function registered(address lender) external view returns (bool);

    // ── Initialization (one-time, by deployer) ──
    function initialize(address profileTemplate_) external;

    // ── Mutations (all gated by EXTCODEHASH check) ──
    function emitRegister() external;
    function emitRateSet(address loanToken, uint256 ratePerSecond) external;
    function emitAllowedCollateralsSet(address[] calldata collaterals) external;
    function emitAllowedCollateralAdded(address collateral) external;
    function emitAllowedCollateralRemoved(address collateral) external;
    function emitPaused() external;
    function emitUnpaused() external;
    function emitMarketCreated(
        bytes32 id,
        address loanToken,
        address collateralToken,
        uint256 ratePerSecond
    ) external;
    function emitFulfilledBorrow(bytes32 id, uint256 loanAmount) external;
    function emitWithdrawnFromMarket(bytes32 id, uint256 assets) external;
}
