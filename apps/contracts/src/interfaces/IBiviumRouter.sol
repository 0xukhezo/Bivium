// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {MarketParams} from "./IBivium.sol";

interface IBiviumRouter {
    /// @dev A single lender candidate within a borrow order. The Router will
    ///      iterate candidates in array order, attempting to fill `loanAmount`
    ///      from each. The frontend/indexer is expected to pass them sorted by
    ///      `ratePerSecond` ascending and with depth meaningfully greater than
    ///      `loanAmount` so transient failures (paused lender, balance moved
    ///      away, rate stale) can be tolerated by skipping to the next.
    /// @dev `oracle` and `lltv` are not part of this struct: the Router resolves
    ///      them on-chain from `Bivium.getTokenConfig(collateralToken)` so the
    ///      caller cannot supply stale or inconsistent values.
    struct BorrowFill {
        address creator; // lender EOA, has BiviumProfile via ERC-7702
        uint256 ratePerSecond; // must match lender's currently declared rate
    }

    /// @dev A market borrow order with built-in slippage and health-factor
    ///      protection. Mirrors a Uniswap-style swap: the borrower commits to a
    ///      max average rate (slippage) and a min health factor (collateral
    ///      buffer), the Router walks candidates and either fills the full
    ///      `loanAmount` honoring both bounds or reverts.
    struct BorrowOrder {
        address loanToken;
        address collateralToken;
        uint256 loanAmount; // total to borrow; partial fills revert
        uint256 collateralAmount; // total collateral the borrower commits
        uint256 maxAvgRatePerSecond; // weighted-avg rate must be ≤ this
        uint256 minHealthFactor; // WAD-scaled; must be ≥ WAD (1.0)
        BorrowFill[] candidates; // sorted ascending by rate, depth > need
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

    // ── Events ──
    /// @notice Emitted once per successful borrow order, aggregating the fills.
    /// @dev Consumed by the borrower-facing UI ("your order filled at X avg rate").
    event OrderFilled(
        address indexed borrower,
        address indexed loanToken,
        address indexed collateralToken,
        uint256 loanAmount,
        uint256 collateralAmount,
        uint256 weightedAvgRate,
        uint256 fillsCount
    );

    /// @notice Emitted once per individual fill within a borrow order.
    /// @dev Consumed by the lender-facing UI ("you lent X to borrower Y at rate Z")
    ///      and by the indexer to reconstruct per-lender exposure without scanning
    ///      every market's `position` mapping.
    event Fill(address indexed borrower, address indexed lender, address loanToken, uint256 amount, uint256 rate);

    // ── Errors ──
    error EmptyItems();
    error EmptyCandidates();
    error NotAuthorized();
    error ZeroBivium();
    error InconsistentInput();
    error InsufficientLiquidity();
    error SlippageExceeded();
    error UnsupportedCollateral();
    error HealthFactorTooLow();
    error UnsafeHealthFactor();

    // ── Views ──
    function BIVIUM() external view returns (address);

    // ── Borrow ──
    /// @notice Executes an atomic market borrow against the lender orderbook.
    /// @dev Walks `order.candidates` in order. For each candidate: reads its
    ///      live loan-token balance, takes `min(balance, remaining)`, and tries
    ///      `fulfillBorrow → supplyCollateral → borrow` inside a try/catch.
    ///      Any failure (paused lender, rate mismatch, transfer revert) is
    ///      skipped silently and the loop continues with the next candidate.
    /// @dev Reverts atomically if any of:
    ///      - `candidates.length == 0` (`EmptyCandidates`)
    ///      - `minHealthFactor < WAD` (`UnsafeHealthFactor`)
    ///      - `collateralToken` is not registered in Bivium (`UnsupportedCollateral`)
    ///      - `loanAmount` would breach `minHealthFactor` given `collateralAmount`
    ///        and the current oracle price (`HealthFactorTooLow`)
    ///      - candidates collectively cannot cover `loanAmount` (`InsufficientLiquidity`)
    ///      - the realized weighted-average rate exceeds `maxAvgRatePerSecond`
    ///        (`SlippageExceeded`)
    /// @dev Pre-requisite (one-time): `msg.sender` must have called
    ///      `Bivium.setAuthorization(router, true)`.
    /// @dev Pre-requisite (per order): `msg.sender` must have approved the Router
    ///      for `collateralAmount` of `collateralToken`.
    function borrow(BorrowOrder calldata order) external;

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
