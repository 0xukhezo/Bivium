// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.24;

/// @dev Oracle price scale.
uint256 constant ORACLE_PRICE_SCALE = 1e36;

/// @dev Liquidation cursor.
uint256 constant LIQUIDATION_CURSOR = 0.3e18;

/// @dev Max liquidation incentive factor.
uint256 constant MAX_LIQUIDATION_INCENTIVE_FACTOR = 1.15e18;

/// @dev Maximum rate per second allowed in a market.
/// @dev ~1000% APR: 10e18 / (365.25 * 24 * 3600) ~= 3.17e11.
/// @dev Sanity bound against overflow in `wTaylorCompounded`, not an economic limit.
uint256 constant MAX_RATE_PER_SECOND = 317_097_919_837;

/// @dev The EIP-712 typeHash for EIP712Domain.
bytes32 constant DOMAIN_TYPEHASH = keccak256("EIP712Domain(uint256 chainId,address verifyingContract)");

/// @dev The EIP-712 typeHash for Authorization.
bytes32 constant AUTHORIZATION_TYPEHASH =
    keccak256("Authorization(address authorizer,address authorized,bool isAuthorized,uint256 nonce,uint256 deadline)");
