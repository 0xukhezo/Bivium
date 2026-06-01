// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";

import {BiviumChainlinkOracle} from "../../src/oracles/BiviumChainlinkOracle.sol";
import {BiviumOracleFactory} from "../../src/oracles/BiviumOracleFactory.sol";
import {IAggregatorV3} from "../../src/interfaces/IAggregatorV3.sol";

import {MockAggregatorV3} from "../mocks/MockAggregatorV3.sol";

contract BiviumOracleFactoryTest is Test {
    uint256 constant DAY = 24 hours;
    uint256 constant USDC_DEC = 6;
    uint256 constant WBTC_DEC = 8;
    uint8 constant FEED_DEC = 8;

    BiviumOracleFactory internal factory;
    MockAggregatorV3 internal btcUsd;
    MockAggregatorV3 internal usdcUsd;

    event ChainlinkOracleCreated(
        address indexed oracle,
        address indexed baseFeed,
        address indexed quoteFeed,
        uint256 baseFeedStaleness,
        uint256 quoteFeedStaleness,
        uint256 collateralDecimals,
        uint256 loanDecimals
    );

    function setUp() public {
        factory = new BiviumOracleFactory();
        btcUsd = new MockAggregatorV3(FEED_DEC, int256(100_000) * 1e8, block.timestamp);
        usdcUsd = new MockAggregatorV3(FEED_DEC, 1e8, block.timestamp);
    }

    function test_createChainlinkOracle_predictAddressMatches() public {
        address predicted = factory.predictChainlinkOracleAddress(btcUsd, usdcUsd, DAY, DAY, WBTC_DEC, USDC_DEC);

        BiviumChainlinkOracle oracle = factory.createChainlinkOracle(btcUsd, usdcUsd, DAY, DAY, WBTC_DEC, USDC_DEC);

        assertEq(address(oracle), predicted);
        assertGt(predicted.code.length, 0);
    }

    function test_createChainlinkOracle_storesParams() public {
        BiviumChainlinkOracle oracle = factory.createChainlinkOracle(btcUsd, usdcUsd, DAY, DAY, WBTC_DEC, USDC_DEC);

        assertEq(address(oracle.BASE_FEED()), address(btcUsd));
        assertEq(address(oracle.QUOTE_FEED()), address(usdcUsd));
        assertEq(oracle.BASE_FEED_STALENESS(), DAY);
        assertEq(oracle.QUOTE_FEED_STALENESS(), DAY);
        assertEq(oracle.COLLATERAL_DECIMALS(), WBTC_DEC);
        assertEq(oracle.LOAN_DECIMALS(), USDC_DEC);
        assertEq(oracle.SCALE_FACTOR(), 10 ** 34);
    }

    function test_createChainlinkOracle_emitsEvent() public {
        address predicted = factory.predictChainlinkOracleAddress(btcUsd, usdcUsd, DAY, DAY, WBTC_DEC, USDC_DEC);

        vm.expectEmit(true, true, true, true, address(factory));
        emit ChainlinkOracleCreated(predicted, address(btcUsd), address(usdcUsd), DAY, DAY, WBTC_DEC, USDC_DEC);
        factory.createChainlinkOracle(btcUsd, usdcUsd, DAY, DAY, WBTC_DEC, USDC_DEC);
    }

    function test_createChainlinkOracle_revertsIfAlreadyDeployed() public {
        factory.createChainlinkOracle(btcUsd, usdcUsd, DAY, DAY, WBTC_DEC, USDC_DEC);

        vm.expectRevert(bytes("oracle already deployed"));
        factory.createChainlinkOracle(btcUsd, usdcUsd, DAY, DAY, WBTC_DEC, USDC_DEC);
    }

    function test_createChainlinkOracle_differentParamsGiveDifferentAddresses() public {
        // Same feeds but different loan decimals (e.g. native USDC vs USDC.e) must
        // produce different deterministic addresses because the salt is param-derived.
        BiviumChainlinkOracle a = factory.createChainlinkOracle(btcUsd, usdcUsd, DAY, DAY, WBTC_DEC, USDC_DEC);
        BiviumChainlinkOracle b = factory.createChainlinkOracle(btcUsd, usdcUsd, DAY, DAY, WBTC_DEC, USDC_DEC + 1);

        assertTrue(address(a) != address(b));
    }
}
