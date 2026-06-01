// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.24;

import {IOracle} from "../interfaces/IOracle.sol";
import {IAggregatorV3} from "../interfaces/IAggregatorV3.sol";
import {ErrorsLib} from "../libraries/ErrorsLib.sol";

import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

/// @title BiviumChainlinkOracle
/// @notice Minimal oracle that prices `collateral` in `loan` units by composing
///         a `collateral/USD` Chainlink feed (base) and a `loan/USD` Chainlink
///         feed (quote). Designed for Bivium's per-pair `tokenConfigs` registry.
///
/// @dev Scale convention follows `IOracle`: `price()` returns the value of
///      `10**collateralDecimals` units of collateral expressed in
///      `10**loanDecimals` units of loan token, multiplied by
///      `10**(36 + loanDecimals - collateralDecimals)`.
///
///      The implementation re-expresses that scale to absorb both feed
///      decimals so the run-time computation is a single `mulDiv`:
///
///        price = baseAnswer * SCALE_FACTOR / quoteAnswer
///
///      where
///
///        SCALE_FACTOR = 10 ** (36 + loanDec + quoteFeedDec
///                              - collateralDec - baseFeedDec)
///
///      Each feed is independently validated for `answer > 0` and for
///      `block.timestamp - updatedAt <= staleness`.
contract BiviumChainlinkOracle is IOracle {
    /// @notice Base Chainlink feed (collateral priced in USD).
    IAggregatorV3 public immutable BASE_FEED;
    /// @notice Quote Chainlink feed (loan token priced in USD).
    IAggregatorV3 public immutable QUOTE_FEED;
    /// @notice Maximum allowed `block.timestamp - updatedAt` for the base feed.
    uint256 public immutable BASE_FEED_STALENESS;
    /// @notice Maximum allowed `block.timestamp - updatedAt` for the quote feed.
    uint256 public immutable QUOTE_FEED_STALENESS;
    /// @notice Decimals of the collateral ERC-20.
    uint256 public immutable COLLATERAL_DECIMALS;
    /// @notice Decimals of the loan ERC-20.
    uint256 public immutable LOAN_DECIMALS;
    /// @notice Decimals of the base feed answer (cached at construction).
    uint256 public immutable BASE_FEED_DECIMALS;
    /// @notice Decimals of the quote feed answer (cached at construction).
    uint256 public immutable QUOTE_FEED_DECIMALS;
    /// @notice `10 ** (36 + loanDec + quoteFeedDec - collateralDec - baseFeedDec)`.
    uint256 public immutable SCALE_FACTOR;

    constructor(
        IAggregatorV3 baseFeed,
        IAggregatorV3 quoteFeed,
        uint256 baseFeedStaleness,
        uint256 quoteFeedStaleness,
        uint256 collateralDecimals,
        uint256 loanDecimals
    ) {
        require(address(baseFeed) != address(0), ErrorsLib.ZERO_FEED);
        require(address(quoteFeed) != address(0), ErrorsLib.ZERO_FEED);
        require(baseFeedStaleness != 0, ErrorsLib.STALE_PRICE);
        require(quoteFeedStaleness != 0, ErrorsLib.STALE_PRICE);

        uint256 baseFeedDec = baseFeed.decimals();
        uint256 quoteFeedDec = quoteFeed.decimals();

        // Reject configurations where the price scale would underflow.
        // For the curated Arbitrum pairs the minimum exponent is 24, so this
        // is a guardrail against misuse rather than a real-world limit.
        uint256 num = 36 + loanDecimals + quoteFeedDec;
        uint256 sub = collateralDecimals + baseFeedDec;
        require(num >= sub, "scale underflow");

        BASE_FEED = baseFeed;
        QUOTE_FEED = quoteFeed;
        BASE_FEED_STALENESS = baseFeedStaleness;
        QUOTE_FEED_STALENESS = quoteFeedStaleness;
        COLLATERAL_DECIMALS = collateralDecimals;
        LOAN_DECIMALS = loanDecimals;
        BASE_FEED_DECIMALS = baseFeedDec;
        QUOTE_FEED_DECIMALS = quoteFeedDec;
        SCALE_FACTOR = 10 ** (num - sub);
    }

    /// @inheritdoc IOracle
    function price() external view returns (uint256) {
        uint256 baseAnswer = _readFeed(BASE_FEED, BASE_FEED_STALENESS);
        uint256 quoteAnswer = _readFeed(QUOTE_FEED, QUOTE_FEED_STALENESS);
        return Math.mulDiv(baseAnswer, SCALE_FACTOR, quoteAnswer);
    }

    /// @dev Reads a Chainlink feed and reverts if the answer is non-positive or
    ///      older than the configured staleness window.
    function _readFeed(IAggregatorV3 feed, uint256 staleness) internal view returns (uint256) {
        (, int256 answer,, uint256 updatedAt,) = feed.latestRoundData();
        require(answer > 0, ErrorsLib.NON_POSITIVE_ANSWER);
        require(updatedAt != 0, ErrorsLib.STALE_PRICE);
        require(block.timestamp <= updatedAt + staleness, ErrorsLib.STALE_PRICE);
        return uint256(answer);
    }
}
