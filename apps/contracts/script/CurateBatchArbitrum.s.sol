// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";

import {Utils} from "./Utils.s.sol";
import {Bivium} from "../src/Bivium.sol";

/// @title CurateBatchArbitrumScript
/// @notice One-shot curation of the initial Bivium `(collateral, loan)` pair set
///         on Arbitrum One, reusing the `MorphoChainlinkOracleV2` instances that
///         Morpho Blue already operates onchain (interface-compatible with
///         Bivium's `IOracle.price()`, scale `1e36 + loanDec - collateralDec`).
///
/// @dev All four oracles below are built for USDC as the loan token. If you want
///      to add a different loan-token leg, append a new entry with a matching
///      pair-specific oracle — do not reuse a USDC-loan oracle for a non-USDC
///      market because the price scale would be wrong.
contract CurateBatchArbitrumScript is Script, Utils {
    // Arbitrum One collateral tokens.
    address constant WETH = 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1;
    address constant WBTC = 0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f;
    address constant WSTETH = 0x5979D7b546E38E414F7E9822514be443A4800529;
    address constant WEETH = 0x35751007a407ca6FEFfE80b3cB397736D2cf4dbe;

    // Arbitrum One native USDC — the loan token assumed by the four oracles below.
    address constant USDC = 0xaf88d065e77c8cC2239327C5EDb3A432268e5831;

    // Reused MorphoChainlinkOracleV2 deployments (loan = USDC).
    address constant ORACLE_WETH = 0x282FEB10549fde52bD61A6979424Ddf18A4971A2;
    address constant ORACLE_WBTC = 0x88193FcB705d29724A40Bb818eCAA47dD5F014d9;
    address constant ORACLE_WSTETH = 0x8e02a9b9Cc29d783b2fCB71C3a72651B591cae31;
    address constant ORACLE_WEETH = 0x4E49d73434a78866d217BE0B542CA868495CBc77;

    // Mirror Morpho's curated LLTV for each of these blue-chips.
    uint256 constant LLTV_86 = 0.86e18;

    struct Curate {
        string symbol;
        address collateral;
        address loan;
        address oracle;
        uint256 lltv;
    }

    function run() external {
        address bivium = getAddressFromConfigJson(".BIVIUM");

        Curate[4] memory items = [
            Curate({symbol: "WETH/USDC", collateral: WETH, loan: USDC, oracle: ORACLE_WETH, lltv: LLTV_86}),
            Curate({symbol: "WBTC/USDC", collateral: WBTC, loan: USDC, oracle: ORACLE_WBTC, lltv: LLTV_86}),
            Curate({symbol: "wstETH/USDC", collateral: WSTETH, loan: USDC, oracle: ORACLE_WSTETH, lltv: LLTV_86}),
            Curate({symbol: "weETH/USDC", collateral: WEETH, loan: USDC, oracle: ORACLE_WEETH, lltv: LLTV_86})
        ];

        vm.startBroadcast();
        for (uint256 i; i < items.length; ++i) {
            Bivium(bivium).setTokenConfig(items[i].collateral, items[i].loan, items[i].oracle, items[i].lltv);
        }
        vm.stopBroadcast();

        console2.log("Bivium :", bivium);
        for (uint256 i; i < items.length; ++i) {
            console2.log(items[i].symbol);
            console2.log("  collateral :", items[i].collateral);
            console2.log("  loan       :", items[i].loan);
            console2.log("  oracle     :", items[i].oracle);
            console2.log("  lltv       :", items[i].lltv);
        }
    }
}
