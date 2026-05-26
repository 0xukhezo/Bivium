// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.24;

import {MathLib} from "./MathLib.sol";

/// @title SharesMathLib
/// @notice Shares management library.
/// @dev Mitigates share price manipulations using OpenZeppelin's virtual shares method.
library SharesMathLib {
    using MathLib for uint256;

    /// @dev Number of virtual shares.
    uint256 internal constant VIRTUAL_SHARES = 1e6;

    /// @dev Virtual assets sentinel to enforce a price when a market is empty.
    uint256 internal constant VIRTUAL_ASSETS = 1;

    function toSharesDown(uint256 assets, uint256 totalAssets, uint256 totalShares) internal pure returns (uint256) {
        return assets.mulDivDown(totalShares + VIRTUAL_SHARES, totalAssets + VIRTUAL_ASSETS);
    }

    function toAssetsDown(uint256 shares, uint256 totalAssets, uint256 totalShares) internal pure returns (uint256) {
        return shares.mulDivDown(totalAssets + VIRTUAL_ASSETS, totalShares + VIRTUAL_SHARES);
    }

    function toSharesUp(uint256 assets, uint256 totalAssets, uint256 totalShares) internal pure returns (uint256) {
        return assets.mulDivUp(totalShares + VIRTUAL_SHARES, totalAssets + VIRTUAL_ASSETS);
    }

    function toAssetsUp(uint256 shares, uint256 totalAssets, uint256 totalShares) internal pure returns (uint256) {
        return shares.mulDivUp(totalAssets + VIRTUAL_ASSETS, totalShares + VIRTUAL_SHARES);
    }
}
