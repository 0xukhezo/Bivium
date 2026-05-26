// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";

import {Bivium} from "../src/Bivium.sol";
import {Id, MarketParams, CreateMarketInput} from "../src/interfaces/IBivium.sol";
import {MarketParamsLib} from "../src/libraries/MarketParamsLib.sol";

import {MockERC20} from "./mocks/MockERC20.sol";
import {MockOracle} from "./mocks/MockOracle.sol";

/// @dev Common deploy + wiring used by the new Bivium-fork tests. Owner of Bivium
///      is `address(this)` (the test contract) so curating tokens is straightforward.
abstract contract BiviumBaseTest is Test {
    using MarketParamsLib for MarketParams;

    Bivium internal bivium;

    MockERC20 internal loanToken;        // 18-decimals, used as the supply/borrow currency
    MockERC20 internal collateralToken;  // 18-decimals, used as collateral
    MockOracle internal oracle;

    uint256 internal constant LLTV = 0.86e18;
    /// @dev Oracle price scaled to `1e36 + loanDecimals - collateralDecimals = 1e36`
    ///      (both tokens at 18 decimals). 1 collateral == 1 loan.
    uint256 internal constant ORACLE_PRICE = 1e36;

    address internal creator = makeAddr("creator");
    address internal borrower = makeAddr("borrower");
    address internal liquidator = makeAddr("liquidator");

    function setUp() public virtual {
        bivium = new Bivium(address(this));
        loanToken = new MockERC20("LOAN", "LOAN", 18);
        collateralToken = new MockERC20("COLL", "COLL", 18);
        oracle = new MockOracle(ORACLE_PRICE);

        bivium.setTokenConfig(address(collateralToken), address(oracle), LLTV);
    }

    function _input(uint256 ratePerSecond) internal view returns (CreateMarketInput memory) {
        return CreateMarketInput({
            loanToken: address(loanToken),
            collateralToken: address(collateralToken),
            ratePerSecond: ratePerSecond,
            creator: creator
        });
    }

    function _params(uint256 ratePerSecond) internal view returns (MarketParams memory) {
        return MarketParams({
            loanToken: address(loanToken),
            collateralToken: address(collateralToken),
            oracle: address(oracle),
            ratePerSecond: ratePerSecond,
            lltv: LLTV,
            creator: creator
        });
    }

    function _idOf(uint256 ratePerSecond) internal view returns (Id) {
        MarketParams memory p = _params(ratePerSecond);
        return p.id();
    }

    /// @dev Creates a market under `creator` and returns the canonical MarketParams.
    function _createMarket(uint256 ratePerSecond) internal returns (MarketParams memory params) {
        vm.prank(creator);
        bivium.createMarket(_input(ratePerSecond));
        params = _params(ratePerSecond);
    }
}
