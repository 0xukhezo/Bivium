// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IBivium, MarketParams} from "./interfaces/IBivium.sol";
import {IBiviumProfile} from "./interfaces/IBiviumProfile.sol";
import {IBiviumRouter} from "./interfaces/IBiviumRouter.sol";
import {IERC20} from "./interfaces/IERC20.sol";
import {SafeTransferLib} from "./libraries/SafeTransferLib.sol";

/// @title BiviumRouter
/// @notice Stateless entry point for borrowers. Orchestrates the atomic
///         "collateral in / JIT supply via lender's Profile / borrow out" flow
///         for one or many lenders in a single transaction.
/// @dev The Router holds no mutable state. Every call is self-contained from
///      calldata. After any successful transaction, the Router's balance in
///      every token MUST be zero.
contract BiviumRouter is IBiviumRouter {
    using SafeTransferLib for IERC20;

    /// @inheritdoc IBiviumRouter
    address public immutable BIVIUM;

    constructor(address bivium_) {
        if (bivium_ == address(0)) revert ZeroBivium();
        BIVIUM = bivium_;
    }

    /// @inheritdoc IBiviumRouter
    function borrow(BorrowItem[] calldata items) external {
        uint256 len = items.length;
        if (len == 0) revert EmptyItems();
        if (!IBivium(BIVIUM).isAuthorized(msg.sender, address(this))) revert NotAuthorized();

        for (uint256 i; i < len;) {
            BorrowItem calldata it = items[i];

            // 1. Trigger the lender's JIT supply first. `params.creator` is the
            //    lender's EOA, delegated to the BiviumProfile via ERC-7702.
            //    `fulfillBorrow` creates the market on demand if needed,
            //    enforces the lender's rules, and supplies `loanAmount` on the
            //    lender's behalf. Must run before `supplyCollateral` because
            //    that step requires the market to already exist.
            IBiviumProfile(it.params.creator).fulfillBorrow(it.params, it.loanAmount);

            // 2. Pull collateral from the borrower to the Router, then deposit it
            //    into Bivium crediting the borrower's collateral position.
            IERC20(it.params.collateralToken).safeTransferFrom(msg.sender, address(this), it.collateralAmount);
            IERC20(it.params.collateralToken).safeApprove(BIVIUM, it.collateralAmount);
            IBivium(BIVIUM).supplyCollateral(it.params, it.collateralAmount, msg.sender, "");

            // 3. Borrow on behalf of the borrower. The borrower authorized this
            //    Router on Bivium (checked once at the top), so the call passes
            //    `_isSenderAuthorized`. Loan tokens go straight to the borrower.
            IBivium(BIVIUM).borrow(it.params, it.loanAmount, 0, msg.sender, msg.sender);

            unchecked {
                ++i;
            }
        }
    }

    /// @inheritdoc IBiviumRouter
    function repay(RepayItem[] calldata items) external {
        uint256 len = items.length;
        if (len == 0) revert EmptyItems();

        for (uint256 i; i < len;) {
            RepayItem calldata it = items[i];
            _repayItem(it.params, it.assets, it.shares, it.maxAssetsIn, msg.sender);
            unchecked {
                ++i;
            }
        }
    }

    /// @inheritdoc IBiviumRouter
    function closePosition(ClosePositionItem[] calldata items) external {
        uint256 len = items.length;
        if (len == 0) revert EmptyItems();
        // `withdrawCollateral` on behalf of the borrower requires authorization.
        if (!IBivium(BIVIUM).isAuthorized(msg.sender, address(this))) revert NotAuthorized();

        for (uint256 i; i < len;) {
            ClosePositionItem calldata it = items[i];
            _repayItem(it.params, it.assets, it.shares, it.maxAssetsIn, msg.sender);
            IBivium(BIVIUM).withdrawCollateral(it.params, it.collateralAmount, msg.sender, msg.sender);
            unchecked {
                ++i;
            }
        }
    }

    /// @dev Shared repay path. Handles both `assets`-mode (exact pull) and
    ///      `shares`-mode (pull up to `maxAssetsIn`, refund the residual).
    /// @dev Reverts with `InconsistentInput` if neither or both of
    ///      (`assets`, `shares`) are non-zero, or if shares-mode receives a
    ///      zero `maxAssetsIn`.
    function _repayItem(
        MarketParams calldata params,
        uint256 assets,
        uint256 shares,
        uint256 maxAssetsIn,
        address onBehalf
    ) internal {
        // Mirrors Bivium's `exactlyOneZero` requirement, surfaced earlier with a clearer error.
        if ((assets == 0) == (shares == 0)) revert InconsistentInput();

        address token = params.loanToken;

        if (assets > 0) {
            // Assets-mode: pull exactly `assets`, repay, allowance is consumed in full.
            IERC20(token).safeTransferFrom(onBehalf, address(this), assets);
            IERC20(token).safeApprove(BIVIUM, assets);
            IBivium(BIVIUM).repay(params, assets, 0, onBehalf, "");
        } else {
            // Shares-mode: pre-pull a capped amount, repay shares, refund the unused balance.
            if (maxAssetsIn == 0) revert InconsistentInput();

            IERC20(token).safeTransferFrom(onBehalf, address(this), maxAssetsIn);
            IERC20(token).safeApprove(BIVIUM, maxAssetsIn);
            (uint256 assetsRepaid,) = IBivium(BIVIUM).repay(params, 0, shares, onBehalf, "");

            // Keep the Router's per-token allowance to Bivium at zero between calls
            // and refund the leftover loan tokens to the borrower so the Router
            // never accumulates dust.
            IERC20(token).safeApprove(BIVIUM, 0);
            if (maxAssetsIn > assetsRepaid) {
                IERC20(token).safeTransfer(onBehalf, maxAssetsIn - assetsRepaid);
            }
        }
    }
}
