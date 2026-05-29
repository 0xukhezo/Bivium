// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";

import {Utils} from "./Utils.s.sol";
import {Bivium} from "../src/Bivium.sol";
import {BiviumRouter} from "../src/BiviumRouter.sol";
import {BiviumEventEmitter} from "../src/BiviumEventEmitter.sol";
import {BiviumProfile} from "../src/BiviumProfile.sol";

/// @title DeployScript
/// @notice Deploys the four Bivium core contracts in the order required by their
///         constructors / `initialize` gates, then persists the resulting
///         addresses to `addresses/{chainId}/config.json`.
///
/// @dev Deployment order (DO NOT reorder):
///        1. `BiviumEventEmitter` — saves `DEPLOYER = msg.sender`.
///        2. `Bivium(owner = deployer EOA)` — owner can be transferred via `setOwner`.
///        3. `BiviumRouter(bivium)`.
///        4. `BiviumProfile(bivium, router, emitter)`.
///        5. `emitter.initialize(profile)` — `onlyDeployer`, must be in the same broadcast.
contract DeployScript is Script, Utils {
    function run() external {
        // `tx.origin` is the actual EOA signing this broadcast (the address that
        // becomes `DEPLOYER` inside the Emitter and `owner` inside Bivium).
        address deployer = tx.origin;

        vm.startBroadcast();

        BiviumEventEmitter emitter = new BiviumEventEmitter();
        Bivium bivium = new Bivium(deployer);
        BiviumRouter router = new BiviumRouter(address(bivium));
        BiviumProfile profile = new BiviumProfile(address(bivium), address(router), address(emitter));
        emitter.initialize(address(profile));

        vm.stopBroadcast();

        writeAddressToConfig(".BIVIUM", address(bivium));
        writeAddressToConfig(".ROUTER", address(router));
        writeAddressToConfig(".EMITTER", address(emitter));
        writeAddressToConfig(".PROFILE_TEMPLATE", address(profile));

        console2.log("Deployer        :", deployer);
        console2.log("Bivium          :", address(bivium));
        console2.log("BiviumRouter    :", address(router));
        console2.log("EventEmitter    :", address(emitter));
        console2.log("ProfileTemplate :", address(profile));
    }
}
