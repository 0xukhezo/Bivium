// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.24;

import {Id, MarketParams} from "../interfaces/IBivium.sol";

/// @title MarketParamsLib
/// @notice Library to convert a market to its id.
/// @dev `MARKET_PARAMS_BYTES_LENGTH` MUST equal `6 * 32` because Bivium's
///      `MarketParams` has 6 fields (loanToken, collateralToken, oracle,
///      ratePerSecond, lltv, creator). Changing the field count or order without
///      updating this constant will make `id()` diverge from any off-chain or
///      integrator-side reconstruction of the struct hash.
library MarketParamsLib {
    /// @notice The length of the data used to compute the id of a market.
    uint256 internal constant MARKET_PARAMS_BYTES_LENGTH = 6 * 32;

    /// @notice Returns the id of the market `marketParams`.
    function id(MarketParams memory marketParams) internal pure returns (Id marketParamsId) {
        assembly ("memory-safe") {
            marketParamsId := keccak256(marketParams, MARKET_PARAMS_BYTES_LENGTH)
        }
    }
}
