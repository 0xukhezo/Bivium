// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";

import {Utils} from "./Utils.s.sol";
import {Bivium} from "../src/Bivium.sol";

/// @title CurateTokenScript
/// @notice Curates (or updates) a `(collateral, loan)` pair in Bivium by calling
///         `setTokenConfig(collateral, loan, oracle, lltv)`. Reads the Bivium
///         address from the per-chain config JSON and the pair tuple from env
///         vars so the same script can curate any pair without code changes.
///
/// @dev Required env vars:
///        COLLATERAL — ERC-20 collateral token address
///        LOAN       — ERC-20 loan token address (the oracle must price collateral in this loan)
///        ORACLE     — Bivium-compatible oracle returning `1e36 + loanDec - collateralDec` scaled price
///        LLTV       — Liquidation LTV, scaled to WAD (1e18). Must be > 0 and < 1e18.
///                     Example: 86% → 860000000000000000
contract CurateTokenScript is Script, Utils {
    function run() external {
        address bivium = getAddressFromConfigJson(".BIVIUM");
        address collateral = vm.envAddress("COLLATERAL");
        address loan = vm.envAddress("LOAN");
        address oracle = vm.envAddress("ORACLE");
        uint256 lltv = vm.envUint("LLTV");

        vm.startBroadcast();
        Bivium(bivium).setTokenConfig(collateral, loan, oracle, lltv);
        vm.stopBroadcast();

        console2.log("Bivium     :", bivium);
        console2.log("Collateral :", collateral);
        console2.log("Loan       :", loan);
        console2.log("Oracle     :", oracle);
        console2.log("LLTV       :", lltv);
    }
}
