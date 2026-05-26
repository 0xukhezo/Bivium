// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.5.0;

/// @title IOracle
/// @notice Interface that oracles used by Bivium must implement.
/// @dev It is the user's responsibility to select markets with safe oracles.
interface IOracle {
    /// @notice Returns the price of 1 asset of collateral token quoted in 1 asset of loan token, scaled by 1e36.
    /// @dev Corresponds to the price of 10**(collateral decimals) units of collateral token quoted in
    ///      10**(loan decimals) units of loan token with `36 + loan decimals - collateral decimals` decimals of precision.
    function price() external view returns (uint256);
}
