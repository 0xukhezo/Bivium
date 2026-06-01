// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.24;

import {IAggregatorV3} from "../interfaces/IAggregatorV3.sol";
import {ErrorsLib} from "../libraries/ErrorsLib.sol";

import {BiviumChainlinkOracle} from "./BiviumChainlinkOracle.sol";

/// @title BiviumOracleFactory
/// @notice Deploys `BiviumChainlinkOracle` instances at deterministic addresses
///         via `CREATE2`. The salt is derived from the constructor params, so
///         every distinct configuration maps to exactly one oracle address and
///         deploying the same configuration twice reverts.
contract BiviumOracleFactory {
    /// @notice Emitted when a new `BiviumChainlinkOracle` is deployed.
    event ChainlinkOracleCreated(
        address indexed oracle,
        address indexed baseFeed,
        address indexed quoteFeed,
        uint256 baseFeedStaleness,
        uint256 quoteFeedStaleness,
        uint256 collateralDecimals,
        uint256 loanDecimals
    );

    /// @notice Deploys a `BiviumChainlinkOracle` for the given configuration.
    /// @dev Reverts with `ORACLE_ALREADY_DEPLOYED` if an oracle with the same
    ///      configuration already exists at the deterministic address.
    function createChainlinkOracle(
        IAggregatorV3 baseFeed,
        IAggregatorV3 quoteFeed,
        uint256 baseFeedStaleness,
        uint256 quoteFeedStaleness,
        uint256 collateralDecimals,
        uint256 loanDecimals
    ) external returns (BiviumChainlinkOracle oracle) {
        bytes32 salt = _salt(
            baseFeed, quoteFeed, baseFeedStaleness, quoteFeedStaleness, collateralDecimals, loanDecimals
        );

        address predicted = _computeAddress(
            salt, baseFeed, quoteFeed, baseFeedStaleness, quoteFeedStaleness, collateralDecimals, loanDecimals
        );
        require(predicted.code.length == 0, ErrorsLib.ORACLE_ALREADY_DEPLOYED);

        oracle = new BiviumChainlinkOracle{
            salt: salt
        }(baseFeed, quoteFeed, baseFeedStaleness, quoteFeedStaleness, collateralDecimals, loanDecimals);

        emit ChainlinkOracleCreated(
            address(oracle),
            address(baseFeed),
            address(quoteFeed),
            baseFeedStaleness,
            quoteFeedStaleness,
            collateralDecimals,
            loanDecimals
        );
    }

    /// @notice Returns the deterministic address where `createChainlinkOracle`
    ///         would deploy the oracle for the given configuration, regardless
    ///         of whether it has been deployed yet.
    function predictChainlinkOracleAddress(
        IAggregatorV3 baseFeed,
        IAggregatorV3 quoteFeed,
        uint256 baseFeedStaleness,
        uint256 quoteFeedStaleness,
        uint256 collateralDecimals,
        uint256 loanDecimals
    ) external view returns (address) {
        bytes32 salt = _salt(
            baseFeed, quoteFeed, baseFeedStaleness, quoteFeedStaleness, collateralDecimals, loanDecimals
        );
        return _computeAddress(
            salt, baseFeed, quoteFeed, baseFeedStaleness, quoteFeedStaleness, collateralDecimals, loanDecimals
        );
    }

    function _salt(
        IAggregatorV3 baseFeed,
        IAggregatorV3 quoteFeed,
        uint256 baseFeedStaleness,
        uint256 quoteFeedStaleness,
        uint256 collateralDecimals,
        uint256 loanDecimals
    ) internal pure returns (bytes32) {
        return keccak256(
            abi.encode(baseFeed, quoteFeed, baseFeedStaleness, quoteFeedStaleness, collateralDecimals, loanDecimals)
        );
    }

    function _computeAddress(
        bytes32 salt,
        IAggregatorV3 baseFeed,
        IAggregatorV3 quoteFeed,
        uint256 baseFeedStaleness,
        uint256 quoteFeedStaleness,
        uint256 collateralDecimals,
        uint256 loanDecimals
    ) internal view returns (address) {
        bytes memory initCode = abi.encodePacked(
            type(BiviumChainlinkOracle).creationCode,
            abi.encode(baseFeed, quoteFeed, baseFeedStaleness, quoteFeedStaleness, collateralDecimals, loanDecimals)
        );
        bytes32 hash = keccak256(abi.encodePacked(bytes1(0xff), address(this), salt, keccak256(initCode)));
        return address(uint160(uint256(hash)));
    }
}
