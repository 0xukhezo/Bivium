// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";

import {Utils} from "./Utils.s.sol";
import {BiviumOracleFactory} from "../src/oracles/BiviumOracleFactory.sol";

/// @title DeployOracleFactoryScript
/// @notice Deploys `BiviumOracleFactory` and persists its address under the
///         `ORACLE_FACTORY` key in `addresses/{chainId}/config.json`.
///
/// @dev The config JSON must already contain an `ORACLE_FACTORY` key (with any
///      placeholder value) because `vm.writeJson` only overwrites existing keys.
contract DeployOracleFactoryScript is Script, Utils {
    function run() external {
        vm.startBroadcast();
        BiviumOracleFactory factory = new BiviumOracleFactory();
        vm.stopBroadcast();

        writeAddressToConfig(".ORACLE_FACTORY", address(factory));

        console2.log("BiviumOracleFactory :", address(factory));
    }
}
