// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BiviumBaseTest} from "./BiviumBaseTest.sol";
import {MarketParams} from "../src/interfaces/IBivium.sol";
import {MarketParamsLib} from "../src/libraries/MarketParamsLib.sol";
import {MathLib, WAD} from "../src/libraries/MathLib.sol";
import {MAX_RATE_PER_SECOND} from "../src/libraries/ConstantsLib.sol";

contract AccrueInterestInlineTest is BiviumBaseTest {
    using MarketParamsLib for MarketParams;
    using MathLib for uint256;

    /// @dev 5% APR ≈ 5e16 / (365.25 * 24 * 3600) ≈ 1.585e9 per second.
    uint256 internal constant RATE_5_PCT = 1_585_489_599;

    uint256 internal constant COLLATERAL_AMOUNT = 1_000e18;
    uint256 internal constant BORROW_AMOUNT = 500e18;

    function _setupMarketWithBorrow(uint256 rate) internal returns (MarketParams memory params) {
        params = _createMarket(rate);

        // JIT supply == borrow amount.
        loanToken.mint(creator, BORROW_AMOUNT);
        vm.startPrank(creator);
        loanToken.approve(address(bivium), BORROW_AMOUNT);
        bivium.supply(params, BORROW_AMOUNT, 0, creator, "");
        vm.stopPrank();

        collateralToken.mint(borrower, COLLATERAL_AMOUNT);
        vm.startPrank(borrower);
        collateralToken.approve(address(bivium), COLLATERAL_AMOUNT);
        bivium.supplyCollateral(params, COLLATERAL_AMOUNT, borrower, "");
        bivium.borrow(params, BORROW_AMOUNT, 0, borrower, borrower);
        vm.stopPrank();
    }

    function test_accrue_zeroElapsed_noOp() public {
        MarketParams memory params = _setupMarketWithBorrow(RATE_5_PCT);

        (uint128 supplyBefore,, uint128 borrowBefore,, uint128 lastUpdateBefore) = bivium.market(params.id());

        // Same block: no elapsed time.
        bivium.accrueInterest(params);

        (uint128 supplyAfter,, uint128 borrowAfter,, uint128 lastUpdateAfter) = bivium.market(params.id());
        assertEq(supplyAfter, supplyBefore, "supply unchanged");
        assertEq(borrowAfter, borrowBefore, "borrow unchanged");
        assertEq(lastUpdateAfter, lastUpdateBefore, "lastUpdate unchanged");
    }

    function test_accrue_zeroBorrow_noInterest() public {
        // Create a market and supply, but no borrow → no interest accrues.
        MarketParams memory params = _createMarket(RATE_5_PCT);
        loanToken.mint(creator, 100e18);
        vm.startPrank(creator);
        loanToken.approve(address(bivium), 100e18);
        bivium.supply(params, 100e18, 0, creator, "");
        vm.stopPrank();

        (uint128 supplyBefore,,,, ) = bivium.market(params.id());

        skip(30 days);
        bivium.accrueInterest(params);

        (uint128 supplyAfter,, uint128 borrowAfter,,) = bivium.market(params.id());
        assertEq(supplyAfter, supplyBefore, "supply unchanged with zero borrow");
        assertEq(borrowAfter, 0, "borrow still zero");
    }

    function test_accrue_usesRatePerSecondInline() public {
        MarketParams memory params = _setupMarketWithBorrow(RATE_5_PCT);

        (, , uint128 borrowBefore,,) = bivium.market(params.id());
        uint256 elapsed = 365 days;

        skip(elapsed);
        bivium.accrueInterest(params);

        (uint128 supplyAfter,, uint128 borrowAfter,,) = bivium.market(params.id());

        // Compare against the Taylor-compounded expectation using the same MathLib.
        uint256 expectedInterest = uint256(borrowBefore).wMulDown(RATE_5_PCT.wTaylorCompounded(elapsed));
        assertEq(uint256(borrowAfter), uint256(borrowBefore) + expectedInterest, "borrow accrued by Taylor");
        // Supply grows by the same amount.
        assertEq(uint256(supplyAfter), uint256(BORROW_AMOUNT) + expectedInterest, "supply accrued by Taylor");

        // Sanity: 1 year at 5% continuous APR ≈ (e^0.05 - 1) ≈ 5.13% growth.
        // Allow 1% relative slack to absorb the Taylor truncation error.
        uint256 continuous5pct = BORROW_AMOUNT * 5127 / 100_000;  // ~5.127% of borrow
        assertApproxEqRel(expectedInterest, continuous5pct, 0.01e18, "~5.13% interest in 1 year");
    }

    function test_accrue_maxRateNoOverflowOnTaylorBound() public {
        // The plan claims max rate + 30 days does not overflow the Taylor expansion.
        // Borrow a small amount so even 1000% APR fits.
        MarketParams memory params = _setupMarketWithBorrow(MAX_RATE_PER_SECOND);

        skip(30 days);
        // Must not revert.
        bivium.accrueInterest(params);

        (, , uint128 borrowAfter,,) = bivium.market(params.id());
        assertGt(borrowAfter, BORROW_AMOUNT, "interest accrued");
    }

    function test_accrue_isCalledImplicitlyBySupply() public {
        MarketParams memory params = _setupMarketWithBorrow(RATE_5_PCT);

        (, , uint128 borrowBefore,, uint128 lastUpdateBefore) = bivium.market(params.id());

        skip(7 days);

        // A no-op-ish supply (mint 0... not allowed; mint 1 wei to trigger accrue).
        loanToken.mint(creator, 1);
        vm.startPrank(creator);
        loanToken.approve(address(bivium), 1);
        bivium.supply(params, 1, 0, creator, "");
        vm.stopPrank();

        (, , uint128 borrowAfter,, uint128 lastUpdateAfter) = bivium.market(params.id());

        assertGt(borrowAfter, borrowBefore, "interest accrued via supply");
        assertGt(lastUpdateAfter, lastUpdateBefore, "lastUpdate moved forward");
    }
}
