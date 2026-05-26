// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.5.0;

/// @title IBiviumLiquidateCallback
/// @notice Interface that liquidators willing to use `liquidate`'s callback must implement.
interface IBiviumLiquidateCallback {
    /// @notice Callback called when a liquidation occurs.
    /// @dev The callback is called only if data is not empty.
    function onBiviumLiquidate(uint256 repaidAssets, bytes calldata data) external;
}

/// @title IBiviumRepayCallback
/// @notice Interface that users willing to use `repay`'s callback must implement.
interface IBiviumRepayCallback {
    /// @notice Callback called when a repayment occurs.
    /// @dev The callback is called only if data is not empty.
    function onBiviumRepay(uint256 assets, bytes calldata data) external;
}

/// @title IBiviumSupplyCallback
/// @notice Interface that users willing to use `supply`'s callback must implement.
interface IBiviumSupplyCallback {
    /// @notice Callback called when a supply occurs.
    /// @dev The callback is called only if data is not empty.
    function onBiviumSupply(uint256 assets, bytes calldata data) external;
}

/// @title IBiviumSupplyCollateralCallback
/// @notice Interface that users willing to use `supplyCollateral`'s callback must implement.
interface IBiviumSupplyCollateralCallback {
    /// @notice Callback called when a supply of collateral occurs.
    /// @dev The callback is called only if data is not empty.
    function onBiviumSupplyCollateral(uint256 assets, bytes calldata data) external;
}

/// @title IBiviumFlashLoanCallback
/// @notice Interface that users willing to use `flashLoan`'s callback must implement.
interface IBiviumFlashLoanCallback {
    /// @notice Callback called when a flash loan occurs.
    /// @dev The callback is called only if data is not empty.
    function onBiviumFlashLoan(uint256 assets, bytes calldata data) external;
}
