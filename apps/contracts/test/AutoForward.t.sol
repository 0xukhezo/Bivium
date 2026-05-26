// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BiviumBaseTest} from "./BiviumBaseTest.sol";
import {MarketParams} from "../src/interfaces/IBivium.sol";
import {MarketParamsLib} from "../src/libraries/MarketParamsLib.sol";
import {EventsLib} from "../src/libraries/EventsLib.sol";

contract AutoForwardTest is BiviumBaseTest {
    using MarketParamsLib for MarketParams;

    MarketParams internal params;

    uint256 internal constant COLLATERAL_AMOUNT = 1_000e18;
    uint256 internal constant BORROW_AMOUNT = 500e18;

    function setUp() public override {
        super.setUp();
        // rate = 0: keeps interest exactly 0 so amounts match precisely.
        params = _createMarket(0);

        // Bivium's JIT model: supply only the exact amount the borrower will take
        // (no idle ever sits in the market between supply and borrow). This is
        // exactly what the Router + Profile flow does in production.
        loanToken.mint(creator, BORROW_AMOUNT);
        vm.startPrank(creator);
        loanToken.approve(address(bivium), BORROW_AMOUNT);
        bivium.supply(params, BORROW_AMOUNT, 0, creator, "");
        vm.stopPrank();

        // Borrower supplies collateral and borrows everything available.
        collateralToken.mint(borrower, COLLATERAL_AMOUNT);
        vm.startPrank(borrower);
        collateralToken.approve(address(bivium), COLLATERAL_AMOUNT);
        bivium.supplyCollateral(params, COLLATERAL_AMOUNT, borrower, "");
        bivium.borrow(params, BORROW_AMOUNT, 0, borrower, borrower);
        vm.stopPrank();
    }

    function test_repay_fullRepay_idleForwardedToCreator() public {
        uint256 creatorBalanceBefore = loanToken.balanceOf(creator);

        // Borrower repays the full amount. rate = 0 so principal == debt.
        vm.startPrank(borrower);
        loanToken.approve(address(bivium), BORROW_AMOUNT);
        bivium.repay(params, BORROW_AMOUNT, 0, borrower, "");
        vm.stopPrank();

        // Auto-forward should have moved the full BORROW_AMOUNT back to the creator.
        // What remains in the market: only the buffer that was never lent.
        (uint128 totalSupplyAssets, uint128 totalSupplyShares, uint128 totalBorrowAssets,,) =
            bivium.market(params.id());

        // After full repay, no borrow and idle equals the original supply.
        // Auto-forward should bring idle to zero (or near zero modulo share rounding).
        assertEq(totalBorrowAssets, 0, "no debt left");
        assertEq(totalSupplyAssets, 0, "supply drained by auto-forward");
        // Shares may be left as dust due to round-down; should be at most virtual-share scale.
        assertLe(totalSupplyShares, 1e6, "supply shares drained to dust");

        // Creator's EOA should be back to ~original supply (gained back via repay + forward).
        assertEq(loanToken.balanceOf(creator) - creatorBalanceBefore, BORROW_AMOUNT, "creator received repayment");
    }

    function test_repay_partialAmountRepay_idleForwardedProportionally() public {
        uint256 partialAmount = 200e18;
        uint256 creatorBalanceBefore = loanToken.balanceOf(creator);

        vm.startPrank(borrower);
        loanToken.approve(address(bivium), partialAmount);
        bivium.repay(params, partialAmount, 0, borrower, "");
        vm.stopPrank();

        assertEq(
            loanToken.balanceOf(creator) - creatorBalanceBefore,
            partialAmount,
            "creator received the partialAmount repayment"
        );

        // Market: borrow reduced by `partialAmount`, supply reduced by `partialAmount` (forward), idle still ~ 0.
        (uint128 totalSupplyAssets,, uint128 totalBorrowAssets,,) = bivium.market(params.id());
        assertEq(totalBorrowAssets, BORROW_AMOUNT - partialAmount, "borrow reduced by partialAmount");
        // After auto-forward, supply should equal borrow (no idle remaining).
        assertEq(totalSupplyAssets, totalBorrowAssets, "no idle remains");
    }

    function test_repay_emitsAutoForwardEvent() public {
        vm.startPrank(borrower);
        loanToken.approve(address(bivium), BORROW_AMOUNT);

        vm.expectEmit(true, true, false, true, address(bivium));
        emit EventsLib.AutoForward(params.id(), creator, BORROW_AMOUNT);
        bivium.repay(params, BORROW_AMOUNT, 0, borrower, "");
        vm.stopPrank();
    }

    function test_repay_doesNotAffectBorrowerCollateral() public {
        (, , uint128 collateralBefore) = bivium.position(params.id(), borrower);

        vm.startPrank(borrower);
        loanToken.approve(address(bivium), BORROW_AMOUNT);
        bivium.repay(params, BORROW_AMOUNT, 0, borrower, "");
        vm.stopPrank();

        (uint256 supplyShares, uint128 borrowShares, uint128 collateralAfter) =
            bivium.position(params.id(), borrower);

        assertEq(collateralAfter, collateralBefore, "borrower collateral untouched");
        assertEq(borrowShares, 0, "borrower debt cleared");
        assertEq(supplyShares, 0, "borrower has no supply shares");
    }

    function test_autoForward_burnsCreatorSharesProportionally() public {
        // Pre-repay: creator owns 100% of supply shares.
        (uint256 sharesBefore,,) = bivium.position(params.id(), creator);
        (, uint128 totalSharesBefore,,,) = bivium.market(params.id());
        assertEq(sharesBefore, uint256(totalSharesBefore), "creator owns 100% of shares pre-repay");

        vm.startPrank(borrower);
        loanToken.approve(address(bivium), BORROW_AMOUNT);
        bivium.repay(params, BORROW_AMOUNT, 0, borrower, "");
        vm.stopPrank();

        (uint256 sharesAfter,,) = bivium.position(params.id(), creator);
        (, uint128 totalSharesAfter,,,) = bivium.market(params.id());
        assertEq(sharesAfter, uint256(totalSharesAfter), "creator still owns 100% of remaining shares");
        assertLt(sharesAfter, sharesBefore, "shares decreased");
    }

    function test_liquidate_idleForwardedAfterBadDebtAbsorption() public {
        // Make the position unhealthy: drop the oracle price so collateral
        // covers less than the borrow.
        // Collateral: 1000 @ price 1 = 1000 loan-equivalents.
        // Borrow:     500.
        // LLTV:       86% => max borrow = 1000 * 0.86 = 860 (healthy now).
        // Drop price by half -> max borrow = 500 * 0.86 = 430 (unhealthy).
        oracle.setPrice(ORACLE_PRICE / 2);

        uint256 creatorBalanceBefore = loanToken.balanceOf(creator);

        // Liquidator seizes the full collateral.
        loanToken.mint(liquidator, BORROW_AMOUNT);
        vm.startPrank(liquidator);
        loanToken.approve(address(bivium), BORROW_AMOUNT);
        bivium.liquidate(params, borrower, COLLATERAL_AMOUNT, 0, "");
        vm.stopPrank();

        // After liquidate, market should be drained (auto-forward fires at the tail).
        (uint128 totalSupplyAssets,, uint128 totalBorrowAssets,,) = bivium.market(params.id());
        assertEq(totalBorrowAssets, 0, "no borrow left");
        // The market should not retain idle assets — all forwarded to creator
        // (less any bad-debt socialization).
        assertEq(totalSupplyAssets, 0, "no idle left in market");

        // Creator should have received the repaidAssets via auto-forward.
        // Exact amount depends on liquidation incentive and bad-debt math, but it
        // must be strictly less than the BORROW_AMOUNT (since some was socialized
        // as bad debt).
        uint256 received = loanToken.balanceOf(creator) - creatorBalanceBefore;
        assertGt(received, 0, "creator received something");
        assertLt(received, BORROW_AMOUNT, "received < total borrow due to bad debt");
    }
}
