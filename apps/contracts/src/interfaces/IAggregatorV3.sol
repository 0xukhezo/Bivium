// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.5.0;

/// @title IAggregatorV3
/// @notice Minimal Chainlink AggregatorV3 surface used by `BiviumChainlinkOracle`.
/// @dev Only `decimals()` and `latestRoundData()` are required to price a feed.
interface IAggregatorV3 {
    function decimals() external view returns (uint8);

    function latestRoundData()
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound);
}
