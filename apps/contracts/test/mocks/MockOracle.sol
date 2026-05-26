// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IOracle} from "../../src/interfaces/IOracle.sol";

/// @dev Minimal `IOracle` implementation for tests. Returns a configurable price
///      scaled by `1e36 + loanDecimals - collateralDecimals` (Bivium convention).
contract MockOracle is IOracle {
    uint256 internal _price;

    constructor(uint256 initialPrice) {
        _price = initialPrice;
    }

    function setPrice(uint256 newPrice) external {
        _price = newPrice;
    }

    function price() external view returns (uint256) {
        return _price;
    }
}
