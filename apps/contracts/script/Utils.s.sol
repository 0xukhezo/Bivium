// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {stdJson} from "forge-std/StdJson.sol";

/// @title Utils
/// @notice JSON read/write helpers for the per-chain `addresses/{chainId}/config.json`
///         registry. Mirrors the pattern used in the zeemcoin-contracts repo.
contract Utils is Script {
    using stdJson for string;

    /// @notice Absolute path to the config file for the current chain.
    function getJsonConfigPath() public view returns (string memory) {
        return string.concat(vm.projectRoot(), "/addresses/", vm.toString(block.chainid), "/config.json");
    }

    /// @notice Raw contents of the config file for the current chain.
    function getConfigJson() public view returns (string memory) {
        return vm.readFile(getJsonConfigPath());
    }

    /// @notice Reads an `address` value from the config JSON at the given jq-style key.
    function getAddressFromConfigJson(string memory key) public view returns (address) {
        bytes memory data = getConfigJson().parseRaw(key);
        return abi.decode(data, (address));
    }

    /// @notice Reads a `uint256` value from the config JSON at the given jq-style key.
    function getUintFromConfigJson(string memory key) public view returns (uint256) {
        bytes memory data = getConfigJson().parseRaw(key);
        return abi.decode(data, (uint256));
    }

    /// @notice Persists an `address` value back into the config JSON at the given key.
    /// @dev The key must already exist in the JSON file (with any placeholder value);
    ///      `vm.writeJson` only overwrites existing keys, it does not create new ones.
    function writeAddressToConfig(string memory key, address value) public {
        vm.writeJson(vm.toString(value), getJsonConfigPath(), key);
    }
}
