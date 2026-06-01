// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";

import {Utils} from "./Utils.s.sol";
import {Bivium} from "../src/Bivium.sol";
import {BiviumOracleFactory} from "../src/oracles/BiviumOracleFactory.sol";
import {IAggregatorV3} from "../src/interfaces/IAggregatorV3.sol";

/// @title CurateBatchArbitrumScript
/// @notice One-shot curation of the initial Bivium `(collateral, loan)` pair set
///         on Arbitrum One. For each pair the script:
///           1. Deploys a `BiviumChainlinkOracle` via `BiviumOracleFactory`
///              (or reuses the deterministic address if it already exists).
///           2. Calls `Bivium.setTokenConfig(collateral, loan, oracle, lltv)`.
///
/// @dev Token decimals: USDC = 6, WBTC = 8, WETH = 18, LINK = 18.
///      All Chainlink USD feeds on Arbitrum return 8 decimals.
///
///      LLTV rationale:
///        - 0.86  → loan = USDC, collateral = blue-chip (BTC, ETH).
///        - 0.86  → blue-chip pair (BTC/ETH, ETH/BTC).
///        - 0.77  → LINK as collateral (more volatile than BTC/ETH).
///        - 0.70  → loan = volatile blue-chip with USDC collateral
///                  (a USDC drawdown is bounded; loan volatility dominates).
///        - 0.60  → loan = LINK (volatile + thinner liquidity).
///
///      Staleness mirrors the public Chainlink heartbeats:
///        - 24h for BTC/USD, ETH/USD, USDC/USD.
///        - 1h  for LINK/USD.
contract CurateBatchArbitrumScript is Script, Utils {
    // Arbitrum One ERC-20 tokens.
    address constant USDC = 0xaf88d065e77c8cC2239327C5EDb3A432268e5831;
    address constant WBTC = 0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f;
    address constant WETH = 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1;
    address constant LINK = 0xf97f4df75117a78c1A5a0DBb814Af92458539FB4;

    // Arbitrum One Chainlink USD price feeds.
    address constant FEED_USDC_USD = 0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3;
    address constant FEED_BTC_USD = 0x6ce185860a4963106506C203335A2910413708e9;
    address constant FEED_ETH_USD = 0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612;
    address constant FEED_LINK_USD = 0x86E53CF1B870786351Da77A57575e79CB55812CB;

    uint256 constant STALENESS_DAY = 24 hours;
    uint256 constant STALENESS_HOUR = 1 hours;

    uint256 constant DEC_USDC = 6;
    uint256 constant DEC_WBTC = 8;
    uint256 constant DEC_WETH = 18;
    uint256 constant DEC_LINK = 18;

    struct Pair {
        string symbol;
        address collateral;
        uint256 collateralDecimals;
        address loan;
        uint256 loanDecimals;
        address baseFeed;
        uint256 baseFeedStaleness;
        address quoteFeed;
        uint256 quoteFeedStaleness;
        uint256 lltv;
    }

    function run() external {
        address bivium = getAddressFromConfigJson(".BIVIUM");
        address factoryAddr = getAddressFromConfigJson(".ORACLE_FACTORY");
        BiviumOracleFactory factory = BiviumOracleFactory(factoryAddr);

        Pair[9] memory items = [
            // 1. WBTC / USDC — long BTC against USDC.
            Pair({
                symbol: "WBTC/USDC",
                collateral: WBTC,
                collateralDecimals: DEC_WBTC,
                loan: USDC,
                loanDecimals: DEC_USDC,
                baseFeed: FEED_BTC_USD,
                baseFeedStaleness: STALENESS_DAY,
                quoteFeed: FEED_USDC_USD,
                quoteFeedStaleness: STALENESS_DAY,
                lltv: 0.86e18
            }),
            // 2. USDC / WBTC — short BTC against USDC collateral.
            Pair({
                symbol: "USDC/WBTC",
                collateral: USDC,
                collateralDecimals: DEC_USDC,
                loan: WBTC,
                loanDecimals: DEC_WBTC,
                baseFeed: FEED_USDC_USD,
                baseFeedStaleness: STALENESS_DAY,
                quoteFeed: FEED_BTC_USD,
                quoteFeedStaleness: STALENESS_DAY,
                lltv: 0.7e18
            }),
            // 3. WETH / USDC.
            Pair({
                symbol: "WETH/USDC",
                collateral: WETH,
                collateralDecimals: DEC_WETH,
                loan: USDC,
                loanDecimals: DEC_USDC,
                baseFeed: FEED_ETH_USD,
                baseFeedStaleness: STALENESS_DAY,
                quoteFeed: FEED_USDC_USD,
                quoteFeedStaleness: STALENESS_DAY,
                lltv: 0.86e18
            }),
            // 4. USDC / WETH.
            Pair({
                symbol: "USDC/WETH",
                collateral: USDC,
                collateralDecimals: DEC_USDC,
                loan: WETH,
                loanDecimals: DEC_WETH,
                baseFeed: FEED_USDC_USD,
                baseFeedStaleness: STALENESS_DAY,
                quoteFeed: FEED_ETH_USD,
                quoteFeedStaleness: STALENESS_DAY,
                lltv: 0.7e18
            }),
            // 5. WBTC / WETH.
            Pair({
                symbol: "WBTC/WETH",
                collateral: WBTC,
                collateralDecimals: DEC_WBTC,
                loan: WETH,
                loanDecimals: DEC_WETH,
                baseFeed: FEED_BTC_USD,
                baseFeedStaleness: STALENESS_DAY,
                quoteFeed: FEED_ETH_USD,
                quoteFeedStaleness: STALENESS_DAY,
                lltv: 0.86e18
            }),
            // 6. WETH / WBTC.
            Pair({
                symbol: "WETH/WBTC",
                collateral: WETH,
                collateralDecimals: DEC_WETH,
                loan: WBTC,
                loanDecimals: DEC_WBTC,
                baseFeed: FEED_ETH_USD,
                baseFeedStaleness: STALENESS_DAY,
                quoteFeed: FEED_BTC_USD,
                quoteFeedStaleness: STALENESS_DAY,
                lltv: 0.86e18
            }),
            // 7. LINK / USDC.
            Pair({
                symbol: "LINK/USDC",
                collateral: LINK,
                collateralDecimals: DEC_LINK,
                loan: USDC,
                loanDecimals: DEC_USDC,
                baseFeed: FEED_LINK_USD,
                baseFeedStaleness: STALENESS_HOUR,
                quoteFeed: FEED_USDC_USD,
                quoteFeedStaleness: STALENESS_DAY,
                lltv: 0.77e18
            }),
            // 8. USDC / LINK.
            Pair({
                symbol: "USDC/LINK",
                collateral: USDC,
                collateralDecimals: DEC_USDC,
                loan: LINK,
                loanDecimals: DEC_LINK,
                baseFeed: FEED_USDC_USD,
                baseFeedStaleness: STALENESS_DAY,
                quoteFeed: FEED_LINK_USD,
                quoteFeedStaleness: STALENESS_HOUR,
                lltv: 0.6e18
            }),
            // 9. LINK / WBTC.
            Pair({
                symbol: "LINK/WBTC",
                collateral: LINK,
                collateralDecimals: DEC_LINK,
                loan: WBTC,
                loanDecimals: DEC_WBTC,
                baseFeed: FEED_LINK_USD,
                baseFeedStaleness: STALENESS_HOUR,
                quoteFeed: FEED_BTC_USD,
                quoteFeedStaleness: STALENESS_DAY,
                lltv: 0.77e18
            })
        ];

        vm.startBroadcast();
        address[9] memory oracles;
        for (uint256 i; i < items.length; ++i) {
            Pair memory p = items[i];
            address predicted = factory.predictChainlinkOracleAddress(
                IAggregatorV3(p.baseFeed),
                IAggregatorV3(p.quoteFeed),
                p.baseFeedStaleness,
                p.quoteFeedStaleness,
                p.collateralDecimals,
                p.loanDecimals
            );
            address oracle = predicted;
            if (predicted.code.length == 0) {
                oracle = address(
                    factory.createChainlinkOracle(
                        IAggregatorV3(p.baseFeed),
                        IAggregatorV3(p.quoteFeed),
                        p.baseFeedStaleness,
                        p.quoteFeedStaleness,
                        p.collateralDecimals,
                        p.loanDecimals
                    )
                );
            }
            Bivium(bivium).setTokenConfig(p.collateral, p.loan, oracle, p.lltv);
            oracles[i] = oracle;
        }
        vm.stopBroadcast();

        console2.log("Bivium         :", bivium);
        console2.log("OracleFactory  :", factoryAddr);
        for (uint256 i; i < items.length; ++i) {
            Pair memory p = items[i];
            console2.log(p.symbol);
            console2.log("  collateral :", p.collateral);
            console2.log("  loan       :", p.loan);
            console2.log("  oracle     :", oracles[i]);
            console2.log("  lltv       :", p.lltv);
        }
    }
}
