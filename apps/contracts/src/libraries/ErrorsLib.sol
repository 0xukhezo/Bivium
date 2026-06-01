// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.24;

/// @title ErrorsLib
/// @notice Library exposing error messages.
library ErrorsLib {
    /// @notice Thrown when the caller is not the owner.
    string internal constant NOT_OWNER = "not owner";

    /// @notice Thrown when the value is already set.
    string internal constant ALREADY_SET = "already set";

    /// @notice Thrown when a token oracle in the registry is the zero address.
    string internal constant ZERO_ORACLE = "zero oracle";

    /// @notice Thrown when an LLTV is zero or >= WAD.
    string internal constant INVALID_LLTV = "invalid lltv";

    /// @notice Thrown when creating a market with a collateral token that is not
    ///         curated in the token registry.
    string internal constant COLLATERAL_NOT_CURATED = "collateral not curated";

    /// @notice Thrown when `input.creator != msg.sender` on `createMarket`.
    string internal constant NOT_CREATOR = "not creator";

    /// @notice Thrown when the ratePerSecond on `createMarket` exceeds `MAX_RATE_PER_SECOND`.
    string internal constant RATE_TOO_HIGH = "rate too high";

    /// @notice Thrown when `supply.onBehalf != marketParams.creator`. Bivium markets are mono-lender.
    string internal constant SUPPLY_NOT_CREATOR = "supply onBehalf must be creator";

    /// @notice Thrown when the market is already created.
    string internal constant MARKET_ALREADY_CREATED = "market already created";

    /// @notice Thrown when a token to transfer doesn't have code.
    string internal constant NO_CODE = "no code";

    /// @notice Thrown when the market is not created.
    string internal constant MARKET_NOT_CREATED = "market not created";

    /// @notice Thrown when not exactly one of the input amounts is zero.
    string internal constant INCONSISTENT_INPUT = "inconsistent input";

    /// @notice Thrown when zero assets is passed as input.
    string internal constant ZERO_ASSETS = "zero assets";

    /// @notice Thrown when a zero address is passed as input.
    string internal constant ZERO_ADDRESS = "zero address";

    /// @notice Thrown when the caller is not authorized to conduct an action.
    string internal constant UNAUTHORIZED = "unauthorized";

    /// @notice Thrown when the collateral is insufficient to `borrow` or `withdrawCollateral`.
    string internal constant INSUFFICIENT_COLLATERAL = "insufficient collateral";

    /// @notice Thrown when the liquidity is insufficient to `withdraw` or `borrow`.
    string internal constant INSUFFICIENT_LIQUIDITY = "insufficient liquidity";

    /// @notice Thrown when the position to liquidate is healthy.
    string internal constant HEALTHY_POSITION = "position is healthy";

    /// @notice Thrown when the authorization signature is invalid.
    string internal constant INVALID_SIGNATURE = "invalid signature";

    /// @notice Thrown when the authorization signature is expired.
    string internal constant SIGNATURE_EXPIRED = "signature expired";

    /// @notice Thrown when the nonce is invalid.
    string internal constant INVALID_NONCE = "invalid nonce";

    /// @notice Thrown when a token transfer reverted.
    string internal constant TRANSFER_REVERTED = "transfer reverted";

    /// @notice Thrown when a token transfer returned false.
    string internal constant TRANSFER_RETURNED_FALSE = "transfer returned false";

    /// @notice Thrown when a token transferFrom reverted.
    string internal constant TRANSFER_FROM_REVERTED = "transferFrom reverted";

    /// @notice Thrown when a token transferFrom returned false.
    string internal constant TRANSFER_FROM_RETURNED_FALSE = "transferFrom returned false";

    /// @notice Thrown when a token approve reverted.
    string internal constant APPROVE_REVERTED = "approve reverted";

    /// @notice Thrown when a token approve returned false.
    string internal constant APPROVE_RETURNED_FALSE = "approve returned false";

    /// @notice Thrown when the maximum uint128 is exceeded.
    string internal constant MAX_UINT128_EXCEEDED = "max uint128 exceeded";

    /// @notice Thrown when a Chainlink feed passed to an oracle is the zero address.
    string internal constant ZERO_FEED = "zero feed";

    /// @notice Thrown when a Chainlink feed answer is zero or negative.
    string internal constant NON_POSITIVE_ANSWER = "non-positive answer";

    /// @notice Thrown when a Chainlink feed has not been updated within its allowed staleness window.
    string internal constant STALE_PRICE = "stale price";

    /// @notice Thrown when the oracle factory is asked to deploy an oracle that already exists.
    string internal constant ORACLE_ALREADY_DEPLOYED = "oracle already deployed";
}
