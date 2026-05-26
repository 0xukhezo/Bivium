// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {MarketParams} from "./IBivium.sol";

interface IBiviumRouter {
    /// @dev `MarketParams` is the full Bivium market descriptor (6 fields including
    ///      `creator`, which is the lender's EOA that has the `BiviumProfile`
    ///      delegate attached via ERC-7702).
    struct BorrowItem {
        MarketParams params;
        uint256 collateralAmount;
        uint256 loanAmount;
    }

    /// @dev A repayment instruction. Exactly one of `assets` or `shares` must be
    ///      non-zero (mirrors `Bivium.repay`'s dual-mode).
    /// @dev When `shares > 0`, `maxAssetsIn` caps the loan-token amount the
    ///      Router pulls from the borrower. Any unused balance is refunded.
    ///      When `assets > 0`, `maxAssetsIn` is ignored.
    struct RepayItem {
        MarketParams params;
        uint256 assets;
        uint256 shares;
        uint256 maxAssetsIn;
    }

    /// @dev Combines a repay with a collateral withdrawal in a single atomic
    ///      action. `collateralAmount > 0` is required; for repay-only flows,
    ///      use `repay()` instead.
    struct ClosePositionItem {
        MarketParams params;
        uint256 assets;
        uint256 shares;
        uint256 maxAssetsIn;
        uint256 collateralAmount;
    }

    // ── Errors ──
    error EmptyItems();
    error NotAuthorized();
    error ZeroBivium();
    error InconsistentInput();

    // ── Views ──
    function BIVIUM() external view returns (address);

    // ── Borrow ──
    /// @notice Executes an atomic multi-lender borrow.
    /// @dev For each item: pulls collateral from `msg.sender`, calls
    ///      `fulfillBorrow` on the lender's Profile (at `params.creator`, via
    ///      ERC-7702), then borrows on behalf of `msg.sender`.
    /// @dev If any item fails, the entire transaction reverts (no partial state).
    /// @dev Pre-requisite (one-time): `msg.sender` must have called
    ///      `Bivium.setAuthorization(router, true)` so the Router can borrow on
    ///      their behalf.
    /// @dev Pre-requisite (per item): `msg.sender` must have approved the Router
    ///      for `collateralAmount` of `params.collateralToken`.
    function borrow(BorrowItem[] calldata items) external;

    // ── Repay ──
    /// @notice Executes an atomic multi-market repayment.
    /// @dev `Bivium.repay` has no on-chain authorization check (anyone may repay
    ///      anyone's debt), so this function does NOT require `setAuthorization`.
    /// @dev Each item pulls loan tokens from `msg.sender` and credits the
    ///      `Bivium.repay` to `msg.sender`'s position. Bivium's auto-forward
    ///      sends the repaid amount directly to `params.creator` (the lender).
    /// @dev Pre-requisite (per loan token): `msg.sender` must have approved the
    ///      Router for at least `assets` (assets-mode) or `maxAssetsIn`
    ///      (shares-mode), summed across items sharing that token.
    function repay(RepayItem[] calldata items) external;

    // ── Close position ──
    /// @notice Repays a position and withdraws its collateral atomically per item.
    /// @dev Same auth model as `borrow`: requires
    ///      `Bivium.setAuthorization(router, true)` upfront for the withdraw step.
    /// @dev Frontend typical use: repay full debt (shares-mode with
    ///      `shares == position.borrowShares`) and withdraw full collateral
    ///      (`collateralAmount == position.collateral`).
    function closePosition(ClosePositionItem[] calldata items) external;
}
