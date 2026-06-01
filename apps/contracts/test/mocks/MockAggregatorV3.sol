// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IAggregatorV3} from "../../src/interfaces/IAggregatorV3.sol";

/// @notice Settable Chainlink AggregatorV3 mock used in oracle tests.
contract MockAggregatorV3 is IAggregatorV3 {
    uint8 internal _decimals;
    int256 internal _answer;
    uint256 internal _updatedAt;

    constructor(uint8 feedDecimals, int256 initialAnswer, uint256 initialUpdatedAt) {
        _decimals = feedDecimals;
        _answer = initialAnswer;
        _updatedAt = initialUpdatedAt;
    }

    function setAnswer(int256 newAnswer) external {
        _answer = newAnswer;
    }

    function setUpdatedAt(uint256 newUpdatedAt) external {
        _updatedAt = newUpdatedAt;
    }

    function decimals() external view returns (uint8) {
        return _decimals;
    }

    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80) {
        return (1, _answer, _updatedAt, _updatedAt, 1);
    }
}
