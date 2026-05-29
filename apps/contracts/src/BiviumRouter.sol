// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IBivium, MarketParams, TokenConfig} from "./interfaces/IBivium.sol";
import {IBiviumProfile} from "./interfaces/IBiviumProfile.sol";
import {IBiviumRouter} from "./interfaces/IBiviumRouter.sol";
import {IERC20} from "./interfaces/IERC20.sol";
import {IOracle} from "./interfaces/IOracle.sol";
import {ORACLE_PRICE_SCALE} from "./libraries/ConstantsLib.sol";
import {MathLib, WAD} from "./libraries/MathLib.sol";
import {SafeTransferLib} from "./libraries/SafeTransferLib.sol";

/// @dev Local read-only interface for ERC-20 `balanceOf`. The shared `IERC20`
///      is intentionally empty to force all token movements through
///      `SafeTransferLib`; this interface only exposes the view we need here.
interface IERC20Balance {
    function balanceOf(address account) external view returns (uint256);
}

/// @title BiviumRouter
/// @notice Stateless entry point for borrowers. Orchestrates the atomic
///         "collateral in / JIT supply via lender's Profile / borrow out" flow
///         for one or many lenders in a single transaction.
/// @dev The Router holds no mutable state. Every call is self-contained from
///      calldata. After any successful transaction, the Router's balance in
///      every token MUST be zero.
contract BiviumRouter is IBiviumRouter {
    using MathLib for uint256;
    using SafeTransferLib for IERC20;

    /// @inheritdoc IBiviumRouter
    address public immutable BIVIUM;

    constructor(address bivium_) {
        if (bivium_ == address(0)) revert ZeroBivium();
        BIVIUM = bivium_;
    }

    /// @inheritdoc IBiviumRouter
    function borrow(BorrowOrder calldata order) external {
        // ── 1. Input validation ──
        uint256 nCandidates = order.candidates.length;
        if (nCandidates == 0) revert EmptyCandidates();
        if (order.loanAmount == 0 || order.collateralAmount == 0) revert InconsistentInput();
        if (order.minHealthFactor < WAD) revert UnsafeHealthFactor();
        if (!IBivium(BIVIUM).isAuthorized(msg.sender, address(this))) revert NotAuthorized();

        // ── 2. Resolve curated config + oracle price once ──
        TokenConfig memory cfg = IBivium(BIVIUM).getTokenConfig(order.collateralToken, order.loanToken);
        if (cfg.oracle == address(0)) revert UnsupportedCollateral();
        uint256 price = IOracle(cfg.oracle).price();

        // ── 3. Health-factor pre-check ──
        //   collateralValue = collateralAmount * price / ORACLE_PRICE_SCALE
        //   maxLoanAtLltv   = collateralValue * lltv / WAD
        //   maxLoanAtHF     = maxLoanAtLltv * WAD / minHealthFactor
        //   loanAmount must be ≤ maxLoanAtHF, otherwise the resulting position
        //   would breach the borrower's chosen safety buffer.
        {
            uint256 collateralValue = order.collateralAmount.mulDivDown(price, ORACLE_PRICE_SCALE);
            uint256 maxLoanAtLltv = collateralValue.mulDivDown(cfg.lltv, WAD);
            uint256 maxLoanAtHF = maxLoanAtLltv.mulDivDown(WAD, order.minHealthFactor);
            if (order.loanAmount > maxLoanAtHF) revert HealthFactorTooLow();
        }

        // ── 4. Pull full collateral upfront, single approve ──
        // Per-fill collateral comes from this pre-pulled pool, distributed
        // proportionally to the loan amount taken from each fill.
        IERC20(order.collateralToken).safeTransferFrom(msg.sender, address(this), order.collateralAmount);
        IERC20(order.collateralToken).safeApprove(BIVIUM, order.collateralAmount);

        // ── 5. Walk candidates: try each fill, skip on revert ──
        uint256 remaining = order.loanAmount;
        uint256 collateralRemaining = order.collateralAmount;
        uint256 weightedRateNum;
        uint256 fillsCount;

        for (uint256 i; i < nCandidates;) {
            if (remaining == 0) break;
            BorrowFill calldata f = order.candidates[i];

            uint256 available = IERC20Balance(order.loanToken).balanceOf(f.creator);
            if (available > 0) {
                uint256 take = available < remaining ? available : remaining;

                // Last fill that closes the order takes whatever collateral is
                // left, absorbing any rounding dust from earlier proportional
                // splits. Earlier fills take their pro-rata share.
                uint256 col =
                    (remaining == take)
                    ? collateralRemaining
                    : order.collateralAmount.mulDivDown(take, order.loanAmount);

                MarketParams memory mp = MarketParams({
                    loanToken: order.loanToken,
                    collateralToken: order.collateralToken,
                    oracle: cfg.oracle,
                    ratePerSecond: f.ratePerSecond,
                    lltv: cfg.lltv,
                    creator: f.creator
                });

                // Only `fulfillBorrow` is wrapped in try/catch: it is the call
                // that can revert for lender-side reasons (paused, rate stale,
                // collateral not whitelisted, balance moved between balanceOf
                // and supply). If it succeeds, `supplyCollateral` and `borrow`
                // are guaranteed to succeed for this fill — any revert from
                // them would indicate a contract-level bug and must propagate.
                try IBiviumProfile(f.creator).fulfillBorrow(mp, take) {
                    IBivium(BIVIUM).supplyCollateral(mp, col, msg.sender, "");
                    IBivium(BIVIUM).borrow(mp, take, 0, msg.sender, msg.sender);

                    unchecked {
                        remaining -= take;
                        collateralRemaining -= col;
                        weightedRateNum += take * f.ratePerSecond;
                        ++fillsCount;
                    }

                    emit Fill(msg.sender, f.creator, order.loanToken, take, f.ratePerSecond);
                } catch {
                    // skip this candidate; loop continues
                }
            }

            unchecked {
                ++i;
            }
        }

        // ── 6. Post-checks: full coverage + slippage ──
        if (remaining > 0) revert InsufficientLiquidity();
        uint256 wavg = weightedRateNum / order.loanAmount;
        if (wavg > order.maxAvgRatePerSecond) revert SlippageExceeded();

        // ── 7. Cleanup: refund leftover collateral + zero the allowance ──
        // Leftover collateral can exist only if a candidate transferred fewer
        // tokens than its proportional share (impossible in practice with the
        // current logic, but keep the guard so the Router never accumulates
        // dust). Resetting the allowance preserves the invariant that the
        // Router's per-token allowance to Bivium is zero between calls.
        if (collateralRemaining > 0) {
            IERC20(order.collateralToken).safeTransfer(msg.sender, collateralRemaining);
        }
        IERC20(order.collateralToken).safeApprove(BIVIUM, 0);

        emit OrderFilled(
            msg.sender,
            order.loanToken,
            order.collateralToken,
            order.loanAmount,
            order.collateralAmount,
            wavg,
            fillsCount
        );
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
