// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";

import {BiviumChainlinkOracle} from "../../src/oracles/BiviumChainlinkOracle.sol";
import {IAggregatorV3} from "../../src/interfaces/IAggregatorV3.sol";

import {MockAggregatorV3} from "../mocks/MockAggregatorV3.sol";

contract BiviumChainlinkOracleTest is Test {
    // Arbitrum-style heartbeats reused in the assertions below.
    uint256 constant DAY = 24 hours;

    // Realistic token decimals.
    uint256 constant USDC_DEC = 6;
    uint256 constant WBTC_DEC = 8;
    uint256 constant WETH_DEC = 18;

    // Chainlink USD feeds are 8 decimals on Arbitrum.
    uint8 constant FEED_DEC = 8;

    MockAggregatorV3 btcUsd;
    MockAggregatorV3 usdcUsd;
    MockAggregatorV3 ethUsd;

    function setUp() public {
        // Round prices keep the SCALE_FACTOR math hand-verifiable.
        btcUsd = new MockAggregatorV3(FEED_DEC, int256(100_000) * 1e8, block.timestamp);
        usdcUsd = new MockAggregatorV3(FEED_DEC, 1e8, block.timestamp);
        ethUsd = new MockAggregatorV3(FEED_DEC, int256(2_000) * 1e8, block.timestamp);
    }

    /* CONSTRUCTOR */

    function test_constructor_revertsIfZeroBaseFeed() public {
        vm.expectRevert(bytes("zero feed"));
        new BiviumChainlinkOracle(IAggregatorV3(address(0)), usdcUsd, DAY, DAY, WBTC_DEC, USDC_DEC);
    }

    function test_constructor_revertsIfZeroQuoteFeed() public {
        vm.expectRevert(bytes("zero feed"));
        new BiviumChainlinkOracle(btcUsd, IAggregatorV3(address(0)), DAY, DAY, WBTC_DEC, USDC_DEC);
    }

    function test_constructor_revertsIfZeroBaseStaleness() public {
        vm.expectRevert(bytes("stale price"));
        new BiviumChainlinkOracle(btcUsd, usdcUsd, 0, DAY, WBTC_DEC, USDC_DEC);
    }

    function test_constructor_revertsIfZeroQuoteStaleness() public {
        vm.expectRevert(bytes("stale price"));
        new BiviumChainlinkOracle(btcUsd, usdcUsd, DAY, 0, WBTC_DEC, USDC_DEC);
    }

    function test_constructor_storesImmutables() public {
        BiviumChainlinkOracle oracle = _wbtcUsdcOracle();

        assertEq(address(oracle.BASE_FEED()), address(btcUsd));
        assertEq(address(oracle.QUOTE_FEED()), address(usdcUsd));
        assertEq(oracle.BASE_FEED_STALENESS(), DAY);
        assertEq(oracle.QUOTE_FEED_STALENESS(), DAY);
        assertEq(oracle.COLLATERAL_DECIMALS(), WBTC_DEC);
        assertEq(oracle.LOAN_DECIMALS(), USDC_DEC);
        assertEq(oracle.BASE_FEED_DECIMALS(), FEED_DEC);
        assertEq(oracle.QUOTE_FEED_DECIMALS(), FEED_DEC);
        // 36 + loanDec + qfedDec - collDec - bfedDec = 36 + 6 + 8 - 8 - 8 = 34.
        assertEq(oracle.SCALE_FACTOR(), 10 ** 34);
    }

    /* PRICE */

    function test_price_wbtcUsdc() public {
        BiviumChainlinkOracle oracle = _wbtcUsdcOracle();

        // 1 WBTC = 100_000 USDC = 100_000 * 1e6 = 1e11 USDC atoms.
        // 1 WBTC atom = 1e-8 WBTC = 1e-8 * 1e11 = 1e3 USDC atoms.
        // Scaled by 1e36 → 1e3 * 1e36 = 1e39.
        assertEq(oracle.price(), 10 ** 39);
    }

    function test_price_usdcWbtc() public {
        BiviumChainlinkOracle oracle = new BiviumChainlinkOracle(usdcUsd, btcUsd, DAY, DAY, USDC_DEC, WBTC_DEC);

        // 1 USDC atom in WBTC atoms scaled by 1e36.
        // 1 USDC = 1/100_000 WBTC = 1e-5 WBTC = 1e-5 * 1e8 atoms = 1e3 WBTC atoms.
        // 1 USDC atom = 1e-6 USDC = 1e-3 WBTC atoms. Scaled by 1e36 → 1e33.
        assertEq(oracle.price(), 10 ** 33);
    }

    function test_price_wethUsdc() public {
        BiviumChainlinkOracle oracle = new BiviumChainlinkOracle(ethUsd, usdcUsd, DAY, DAY, WETH_DEC, USDC_DEC);

        // 1 WETH = 2_000 USDC = 2e9 USDC atoms.
        // 1 WETH atom = 1e-18 WETH = 2e9 / 1e18 = 2e-9 USDC atoms.
        // Scaled by 1e36 → 2e-9 * 1e36 = 2e27.
        assertEq(oracle.price(), 2 * 10 ** 27);
    }

    function test_price_reciprocalPair_productIs10pow72() public {
        // With matched feed values, A_price * B_price == 10**72 exactly.
        BiviumChainlinkOracle wbtcUsdc = _wbtcUsdcOracle();
        BiviumChainlinkOracle usdcWbtc = new BiviumChainlinkOracle(usdcUsd, btcUsd, DAY, DAY, USDC_DEC, WBTC_DEC);

        assertEq(wbtcUsdc.price() * usdcWbtc.price(), 10 ** 72);
    }

    /* FEED VALIDATION */

    function test_price_revertsIfBaseAnswerZero() public {
        BiviumChainlinkOracle oracle = _wbtcUsdcOracle();
        btcUsd.setAnswer(0);
        vm.expectRevert(bytes("non-positive answer"));
        oracle.price();
    }

    function test_price_revertsIfBaseAnswerNegative() public {
        BiviumChainlinkOracle oracle = _wbtcUsdcOracle();
        btcUsd.setAnswer(-1);
        vm.expectRevert(bytes("non-positive answer"));
        oracle.price();
    }

    function test_price_revertsIfQuoteAnswerZero() public {
        BiviumChainlinkOracle oracle = _wbtcUsdcOracle();
        usdcUsd.setAnswer(0);
        vm.expectRevert(bytes("non-positive answer"));
        oracle.price();
    }

    function test_price_revertsIfBaseUpdatedAtZero() public {
        BiviumChainlinkOracle oracle = _wbtcUsdcOracle();
        btcUsd.setUpdatedAt(0);
        vm.expectRevert(bytes("stale price"));
        oracle.price();
    }

    function test_price_revertsIfBaseFeedStale() public {
        BiviumChainlinkOracle oracle = _wbtcUsdcOracle();
        uint256 lastUpdate = block.timestamp;
        // Warp just past the staleness window from `lastUpdate`.
        vm.warp(lastUpdate + DAY + 1);
        vm.expectRevert(bytes("stale price"));
        oracle.price();
    }

    function test_price_revertsIfQuoteFeedStale() public {
        BiviumChainlinkOracle oracle = _wbtcUsdcOracle();
        // Refresh base so only the quote leg is stale.
        vm.warp(block.timestamp + DAY + 1);
        btcUsd.setUpdatedAt(block.timestamp);
        vm.expectRevert(bytes("stale price"));
        oracle.price();
    }

    function test_price_acceptsBoundaryStaleness() public {
        BiviumChainlinkOracle oracle = _wbtcUsdcOracle();
        uint256 lastUpdate = block.timestamp;
        // Exactly at the boundary: block.timestamp == updatedAt + staleness.
        vm.warp(lastUpdate + DAY);
        oracle.price();
    }

    function _wbtcUsdcOracle() internal returns (BiviumChainlinkOracle) {
        return new BiviumChainlinkOracle(btcUsd, usdcUsd, DAY, DAY, WBTC_DEC, USDC_DEC);
    }
}
