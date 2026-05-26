// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";

import {Bivium} from "../../src/Bivium.sol";
import {BiviumEventEmitter} from "../../src/BiviumEventEmitter.sol";
import {BiviumProfile} from "../../src/BiviumProfile.sol";
import {BiviumRouter} from "../../src/BiviumRouter.sol";
import {IBiviumEventEmitter} from "../../src/interfaces/IBiviumEventEmitter.sol";
import {IBiviumProfile} from "../../src/interfaces/IBiviumProfile.sol";
import {IBiviumRouter} from "../../src/interfaces/IBiviumRouter.sol";
import {Id, MarketParams, CreateMarketInput} from "../../src/interfaces/IBivium.sol";
import {MarketParamsLib} from "../../src/libraries/MarketParamsLib.sol";

import {MockERC20} from "../mocks/MockERC20.sol";
import {MockOracle} from "../mocks/MockOracle.sol";

/// @dev End-to-end Bivium suite: real `Bivium`, real `BiviumRouter`, real
///      `BiviumProfile` template, lender EOAs delegated via ERC-7702. The test
///      contract is the Bivium owner so it can curate the collateral token.
contract MultiLenderTest is Test {
    using MarketParamsLib for MarketParams;

    Bivium internal bivium;
    BiviumRouter internal router;
    BiviumProfile internal profileImpl;
    BiviumEventEmitter internal emitter;

    MockERC20 internal loanToken;
    MockERC20 internal collateralToken;
    MockOracle internal oracle;

    uint256 internal constant LLTV = 0.86e18;
    /// @dev Both tokens 18-decimals → oracle scale = 1e36 (1 collateral == 1 loan).
    uint256 internal constant ORACLE_PRICE = 1e36;

    uint256 internal constant PK_A = 0xA;
    uint256 internal constant PK_B = 0xB;
    address internal lenderA;
    address internal lenderB;

    address internal borrower = makeAddr("borrower");

    function setUp() public {
        bivium = new Bivium(address(this));
        router = new BiviumRouter(address(bivium));
        emitter = new BiviumEventEmitter();
        profileImpl = new BiviumProfile(address(bivium), address(router), address(emitter));
        emitter.initialize(address(profileImpl));

        loanToken = new MockERC20("LOAN", "LOAN", 18);
        collateralToken = new MockERC20("COLL", "COLL", 18);
        oracle = new MockOracle(ORACLE_PRICE);

        bivium.setTokenConfig(address(collateralToken), address(oracle), LLTV);

        lenderA = vm.addr(PK_A);
        lenderB = vm.addr(PK_B);
    }

    // ── Helpers ──

    function _activate(uint256 pk) internal {
        vm.signAndAttachDelegation(address(profileImpl), pk);
    }

    function _arr1(address a) internal pure returns (address[] memory r) {
        r = new address[](1);
        r[0] = a;
    }

    function _params(uint256 rate, address creator) internal view returns (MarketParams memory) {
        return MarketParams({
            loanToken: address(loanToken),
            collateralToken: address(collateralToken),
            oracle: address(oracle),
            ratePerSecond: rate,
            lltv: LLTV,
            creator: creator
        });
    }

    /// @dev Delegates `lender` to the Profile, declares a rate on LOAN, allows
    ///      the test collateral, and tops the EOA with `lenderBalance` of LOAN
    ///      so they can JIT-supply when `fulfillBorrow` fires. The market is
    ///      NOT pre-created — `fulfillBorrow` will create it on-demand.
    function _setupLender(uint256 pk, uint256 rate, uint256 lenderBalance)
        internal
        returns (address lender, MarketParams memory params)
    {
        lender = vm.addr(pk);
        _activate(pk);

        vm.startPrank(lender);
        BiviumProfile(payable(lender)).setRate(address(loanToken), rate);
        BiviumProfile(payable(lender)).setAllowedCollaterals(_arr1(address(collateralToken)));
        vm.stopPrank();

        loanToken.mint(lender, lenderBalance);

        params = _params(rate, lender);
    }

    function _authorizeAndApprove(uint256 collateralAmount) internal {
        vm.prank(borrower);
        bivium.setAuthorization(address(router), true);

        collateralToken.mint(borrower, collateralAmount);
        vm.prank(borrower);
        collateralToken.approve(address(router), collateralAmount);
    }

    // ── Tests ──

    function test_borrow_revertsIfEmptyItems() public {
        _authorizeAndApprove(0);

        IBiviumRouter.BorrowItem[] memory items = new IBiviumRouter.BorrowItem[](0);
        vm.prank(borrower);
        vm.expectRevert(IBiviumRouter.EmptyItems.selector);
        router.borrow(items);
    }

    function test_borrow_revertsIfBorrowerNotAuthorized() public {
        // No setAuthorization call.
        (, MarketParams memory pA) = _setupLender(PK_A, 100, 1_000e18);

        IBiviumRouter.BorrowItem[] memory items = new IBiviumRouter.BorrowItem[](1);
        items[0] = IBiviumRouter.BorrowItem({params: pA, collateralAmount: 100e18, loanAmount: 50e18});

        vm.prank(borrower);
        vm.expectRevert(IBiviumRouter.NotAuthorized.selector);
        router.borrow(items);
    }

    function test_borrow_singleLender_happyPath() public {
        (, MarketParams memory pA) = _setupLender(PK_A, 100, 1_000e18);

        uint256 collateral = 1_000e18;
        uint256 loan = 500e18;
        _authorizeAndApprove(collateral);

        IBiviumRouter.BorrowItem[] memory items = new IBiviumRouter.BorrowItem[](1);
        items[0] = IBiviumRouter.BorrowItem({params: pA, collateralAmount: collateral, loanAmount: loan});

        vm.prank(borrower);
        router.borrow(items);

        // Borrower received the loan, gave up the collateral.
        assertEq(loanToken.balanceOf(borrower), loan, "borrower got loan");
        assertEq(collateralToken.balanceOf(borrower), 0, "borrower gave up collateral");
        // Lender A's wallet now holds 500 less LOAN (the JIT supply moved through Bivium straight to the borrower).
        assertEq(loanToken.balanceOf(lenderA), 1_000e18 - loan, "lender A wallet decreased");
        // Bivium contract holds the collateral. No loan tokens are sitting in Bivium (JIT model).
        assertEq(collateralToken.balanceOf(address(bivium)), collateral, "bivium holds collateral");
        assertEq(loanToken.balanceOf(address(bivium)), 0, "bivium holds no loan");
        // Router is stateless: zero balances in every token.
        assertEq(loanToken.balanceOf(address(router)), 0, "router zero LOAN");
        assertEq(collateralToken.balanceOf(address(router)), 0, "router zero COLL");
    }

    function test_borrow_multiLender_atomicSuccess() public {
        (, MarketParams memory pA) = _setupLender(PK_A, 100, 1_000e18);
        (, MarketParams memory pB) = _setupLender(PK_B, 200, 1_000e18);

        uint256 collateralEach = 600e18;
        uint256 loanEach = 300e18;
        _authorizeAndApprove(collateralEach * 2);

        IBiviumRouter.BorrowItem[] memory items = new IBiviumRouter.BorrowItem[](2);
        items[0] = IBiviumRouter.BorrowItem({params: pA, collateralAmount: collateralEach, loanAmount: loanEach});
        items[1] = IBiviumRouter.BorrowItem({params: pB, collateralAmount: collateralEach, loanAmount: loanEach});

        vm.prank(borrower);
        router.borrow(items);

        assertEq(loanToken.balanceOf(borrower), loanEach * 2, "borrower got 2x loan");
        assertEq(loanToken.balanceOf(lenderA), 1_000e18 - loanEach, "lender A wallet decreased");
        assertEq(loanToken.balanceOf(lenderB), 1_000e18 - loanEach, "lender B wallet decreased");

        // Each market is independent.
        (uint128 supplyA,, uint128 borrowA,,) = bivium.market(pA.id());
        (uint128 supplyB,, uint128 borrowB,,) = bivium.market(pB.id());
        assertEq(supplyA, loanEach, "market A supply");
        assertEq(supplyB, loanEach, "market B supply");
        assertEq(borrowA, loanEach, "market A borrow");
        assertEq(borrowB, loanEach, "market B borrow");

        // Router stateless.
        assertEq(loanToken.balanceOf(address(router)), 0);
        assertEq(collateralToken.balanceOf(address(router)), 0);
    }

    function test_borrow_multiLender_anyFailRevertsAll() public {
        (, MarketParams memory pA) = _setupLender(PK_A, 100, 1_000e18);
        // Lender B is set up with only 10 LOAN — far less than the 300 the borrower wants from them.
        (, MarketParams memory pB) = _setupLender(PK_B, 200, 10e18);

        uint256 collateralEach = 600e18;
        uint256 loanEach = 300e18;
        _authorizeAndApprove(collateralEach * 2);

        uint256 borrowerLoanBefore = loanToken.balanceOf(borrower);
        uint256 borrowerCollBefore = collateralToken.balanceOf(borrower);
        uint256 lenderABefore = loanToken.balanceOf(lenderA);

        IBiviumRouter.BorrowItem[] memory items = new IBiviumRouter.BorrowItem[](2);
        items[0] = IBiviumRouter.BorrowItem({params: pA, collateralAmount: collateralEach, loanAmount: loanEach});
        items[1] = IBiviumRouter.BorrowItem({params: pB, collateralAmount: collateralEach, loanAmount: loanEach});

        // Item 1 (lender B) will fail when Bivium tries to pull LOAN from B.
        // The whole tx must revert; item 0 (lender A) must have no lingering effect.
        vm.prank(borrower);
        vm.expectRevert();
        router.borrow(items);

        // No state changed anywhere.
        assertEq(loanToken.balanceOf(borrower), borrowerLoanBefore, "borrower LOAN unchanged");
        assertEq(collateralToken.balanceOf(borrower), borrowerCollBefore, "borrower COLL unchanged");
        assertEq(loanToken.balanceOf(lenderA), lenderABefore, "lender A unchanged");
        (uint128 supplyA,, uint128 borrowA,,) = bivium.market(pA.id());
        assertEq(supplyA, 0, "market A supply unchanged");
        assertEq(borrowA, 0, "market A borrow unchanged");
    }

    function test_borrow_createsMarketOnFirstCall() public {
        (, MarketParams memory pA) = _setupLender(PK_A, 100, 1_000e18);

        // Pre-condition: market does not exist yet (Profile creates on-demand).
        (uint128 supplyAssetsBefore,,,, uint128 lastUpdateBefore) = bivium.market(pA.id());
        assertEq(supplyAssetsBefore, 0, "market not created yet");
        assertEq(lastUpdateBefore, 0, "lastUpdate must be 0 before borrow");

        _authorizeAndApprove(1_000e18);
        IBiviumRouter.BorrowItem[] memory items = new IBiviumRouter.BorrowItem[](1);
        items[0] = IBiviumRouter.BorrowItem({params: pA, collateralAmount: 1_000e18, loanAmount: 500e18});

        vm.expectEmit(true, true, false, true, address(emitter));
        emit IBiviumEventEmitter.MarketCreated(lenderA, Id.unwrap(pA.id()), address(loanToken), address(collateralToken), 100);

        vm.prank(borrower);
        router.borrow(items);

        // Post-condition: market exists.
        (,,,, uint128 lastUpdateAfter) = bivium.market(pA.id());
        assertGt(lastUpdateAfter, 0, "market created on demand");
    }

    function test_borrow_revertsIfRateMismatch() public {
        (, MarketParams memory pA) = _setupLender(PK_A, 100, 1_000e18);

        // Borrower tries to pass a different rate from what the lender declared.
        MarketParams memory pTampered = _params(50, lenderA);

        _authorizeAndApprove(100e18);
        IBiviumRouter.BorrowItem[] memory items = new IBiviumRouter.BorrowItem[](1);
        items[0] = IBiviumRouter.BorrowItem({params: pTampered, collateralAmount: 100e18, loanAmount: 50e18});

        vm.prank(borrower);
        vm.expectRevert(abi.encodeWithSelector(IBiviumProfile.RateMismatch.selector, uint256(50), uint256(100)));
        router.borrow(items);
        pA; // silence unused
    }

    function test_borrow_revertsIfCollateralInsufficientForLtv() public {
        (, MarketParams memory pA) = _setupLender(PK_A, 100, 1_000e18);

        // LLTV is 0.86; loan == collateral makes the position unhealthy
        // (max_borrow = collateral * 0.86 < loan).
        uint256 collateral = 100e18;
        uint256 loan = 100e18;
        _authorizeAndApprove(collateral);

        IBiviumRouter.BorrowItem[] memory items = new IBiviumRouter.BorrowItem[](1);
        items[0] = IBiviumRouter.BorrowItem({params: pA, collateralAmount: collateral, loanAmount: loan});

        vm.prank(borrower);
        vm.expectRevert(bytes("insufficient collateral"));
        router.borrow(items);
    }

    function test_repay_routesAutoForwardBackToLender() public {
        // rate=1 (rate==0 means "loan token deactivated"); negligible interest
        // in same-block borrow→repay.
        (, MarketParams memory pA) = _setupLender(PK_A, 1, 1_000e18);

        uint256 collateral = 1_000e18;
        uint256 loan = 500e18;
        _authorizeAndApprove(collateral);

        IBiviumRouter.BorrowItem[] memory items = new IBiviumRouter.BorrowItem[](1);
        items[0] = IBiviumRouter.BorrowItem({params: pA, collateralAmount: collateral, loanAmount: loan});

        vm.prank(borrower);
        router.borrow(items);

        // Lender A is now down `loan`. Borrower repays the full amount.
        uint256 lenderABefore = loanToken.balanceOf(lenderA);

        vm.startPrank(borrower);
        loanToken.approve(address(bivium), loan);
        bivium.repay(pA, loan, 0, borrower, "");
        vm.stopPrank();

        // The auto-forward should have routed the full `loan` back to lender A's wallet,
        // restoring their original balance.
        assertEq(loanToken.balanceOf(lenderA) - lenderABefore, loan, "lender received repayment");
        // And the market is drained of supply (JIT model).
        (uint128 supplyA,, uint128 borrowA,,) = bivium.market(pA.id());
        assertEq(borrowA, 0, "borrow cleared");
        assertEq(supplyA, 0, "supply drained by auto-forward");
    }

    function test_borrow_routerHoldsZeroBalanceAfterEveryCall() public {
        (, MarketParams memory pA) = _setupLender(PK_A, 100, 1_000e18);
        (, MarketParams memory pB) = _setupLender(PK_B, 200, 1_000e18);

        _authorizeAndApprove(1_200e18);

        IBiviumRouter.BorrowItem[] memory items = new IBiviumRouter.BorrowItem[](2);
        items[0] = IBiviumRouter.BorrowItem({params: pA, collateralAmount: 600e18, loanAmount: 300e18});
        items[1] = IBiviumRouter.BorrowItem({params: pB, collateralAmount: 600e18, loanAmount: 300e18});

        vm.prank(borrower);
        router.borrow(items);

        // Invariant: stateless Router → zero balance in every token after success.
        assertEq(loanToken.balanceOf(address(router)), 0, "router LOAN");
        assertEq(collateralToken.balanceOf(address(router)), 0, "router COLL");
        // Allowance the Router gave to Bivium can stay; supplyCollateral pulled exactly the amount we approved.
        assertEq(collateralToken.allowance(address(router), address(bivium)), 0, "router allowance reset");
    }

    // ── Repay tests ──

    /// @dev Opens a single-lender position with `pk` lender at rate 0 (so debt
    ///      stays exactly equal to principal). Returns the canonical params.
    function _openPosition(uint256 pk, uint256 collateralAmount, uint256 loanAmount)
        internal
        returns (MarketParams memory params)
    {
        // rate=1 (rate==0 means "loan token deactivated"). Same-block tests
        // accrue negligible interest.
        (, params) = _setupLender(pk, 1, loanAmount);

        _authorizeAndApprove(collateralAmount);

        IBiviumRouter.BorrowItem[] memory items = new IBiviumRouter.BorrowItem[](1);
        items[0] = IBiviumRouter.BorrowItem({params: params, collateralAmount: collateralAmount, loanAmount: loanAmount});
        vm.prank(borrower);
        router.borrow(items);
    }

    function test_repay_revertsIfEmptyItems() public {
        IBiviumRouter.RepayItem[] memory items = new IBiviumRouter.RepayItem[](0);
        vm.prank(borrower);
        vm.expectRevert(IBiviumRouter.EmptyItems.selector);
        router.repay(items);
    }

    function test_repay_revertsIfInconsistentBothZero() public {
        MarketParams memory pA = _openPosition(PK_A, 1_000e18, 500e18);

        IBiviumRouter.RepayItem[] memory items = new IBiviumRouter.RepayItem[](1);
        items[0] = IBiviumRouter.RepayItem({params: pA, assets: 0, shares: 0, maxAssetsIn: 0});

        vm.prank(borrower);
        vm.expectRevert(IBiviumRouter.InconsistentInput.selector);
        router.repay(items);
    }

    function test_repay_revertsIfInconsistentBothNonZero() public {
        MarketParams memory pA = _openPosition(PK_A, 1_000e18, 500e18);

        IBiviumRouter.RepayItem[] memory items = new IBiviumRouter.RepayItem[](1);
        items[0] = IBiviumRouter.RepayItem({params: pA, assets: 100, shares: 100, maxAssetsIn: 0});

        vm.prank(borrower);
        vm.expectRevert(IBiviumRouter.InconsistentInput.selector);
        router.repay(items);
    }

    function test_repay_revertsIfSharesModeNoMax() public {
        MarketParams memory pA = _openPosition(PK_A, 1_000e18, 500e18);

        IBiviumRouter.RepayItem[] memory items = new IBiviumRouter.RepayItem[](1);
        items[0] = IBiviumRouter.RepayItem({params: pA, assets: 0, shares: 100, maxAssetsIn: 0});

        vm.prank(borrower);
        vm.expectRevert(IBiviumRouter.InconsistentInput.selector);
        router.repay(items);
    }

    function test_repay_assetsMode_singleMarket() public {
        MarketParams memory pA = _openPosition(PK_A, 1_000e18, 500e18);

        // Approve the Router for the repay amount.
        vm.prank(borrower);
        loanToken.approve(address(router), 500e18);

        uint256 lenderABefore = loanToken.balanceOf(lenderA);

        IBiviumRouter.RepayItem[] memory items = new IBiviumRouter.RepayItem[](1);
        items[0] = IBiviumRouter.RepayItem({params: pA, assets: 500e18, shares: 0, maxAssetsIn: 0});

        vm.prank(borrower);
        router.repay(items);

        // Debt cleared, auto-forward delivered the repayment to lender A.
        (uint128 supplyA,, uint128 borrowA,,) = bivium.market(pA.id());
        assertEq(borrowA, 0, "no debt");
        assertEq(supplyA, 0, "supply drained by auto-forward");
        assertEq(loanToken.balanceOf(lenderA) - lenderABefore, 500e18, "lender A received");

        // Router invariants.
        assertEq(loanToken.balanceOf(address(router)), 0, "router LOAN");
        assertEq(loanToken.allowance(address(router), address(bivium)), 0, "router-bivium allowance");
    }

    function test_repay_sharesMode_refundsResidual() public {
        // Open a position. Then in shares-mode the borrower asks to repay their
        // full share balance with a `maxAssetsIn` that overshoots the real cost;
        // the Router must refund the excess to the borrower.
        MarketParams memory pA = _openPosition(PK_A, 1_000e18, 500e18);

        (uint256 supplyShares, uint128 borrowShares,) = bivium.position(pA.id(), borrower);
        supplyShares; // silence unused warning
        assertGt(borrowShares, 0, "has debt");

        // Top-up the borrower with extra LOAN so they can pre-fund `maxAssetsIn`.
        uint256 overshoot = 100e18;
        loanToken.mint(borrower, overshoot);
        uint256 maxIn = 500e18 + overshoot;

        vm.prank(borrower);
        loanToken.approve(address(router), maxIn);

        uint256 borrowerBefore = loanToken.balanceOf(borrower);
        uint256 lenderABefore = loanToken.balanceOf(lenderA);

        IBiviumRouter.RepayItem[] memory items = new IBiviumRouter.RepayItem[](1);
        items[0] = IBiviumRouter.RepayItem({params: pA, assets: 0, shares: borrowShares, maxAssetsIn: maxIn});

        vm.prank(borrower);
        router.repay(items);

        // Borrower's balance change == -(actual repaid), not -maxIn. Refund worked.
        uint256 borrowerNet = borrowerBefore - loanToken.balanceOf(borrower);
        // With rate 0, actual repaid should be ≈ 500e18 (within +1 rounding).
        assertApproxEqAbs(borrowerNet, 500e18, 1, "borrower paid only the actual debt");

        // Lender received the actual repay amount.
        assertApproxEqAbs(loanToken.balanceOf(lenderA) - lenderABefore, 500e18, 1, "lender A received");

        // Debt cleared.
        (uint128 supplyA,, uint128 borrowA,,) = bivium.market(pA.id());
        assertEq(borrowA, 0, "no debt");
        assertEq(supplyA, 0, "supply drained by auto-forward");

        // Router stateless.
        assertEq(loanToken.balanceOf(address(router)), 0, "router LOAN");
        assertEq(loanToken.allowance(address(router), address(bivium)), 0, "router-bivium allowance");
    }

    function test_repay_multiMarket_atomic() public {
        MarketParams memory pA = _openPosition(PK_A, 600e18, 300e18);
        // Open a second position WITHOUT going through `_openPosition` (which
        // re-runs the borrower setup); inline the second borrow instead.
        (, MarketParams memory pB) = _setupLender(PK_B, 1, 300e18);
        collateralToken.mint(borrower, 600e18);
        vm.prank(borrower);
        collateralToken.approve(address(router), 600e18);

        IBiviumRouter.BorrowItem[] memory borrowItems = new IBiviumRouter.BorrowItem[](1);
        borrowItems[0] = IBiviumRouter.BorrowItem({params: pB, collateralAmount: 600e18, loanAmount: 300e18});
        vm.prank(borrower);
        router.borrow(borrowItems);

        // Now repay both atomically.
        vm.prank(borrower);
        loanToken.approve(address(router), 600e18);

        uint256 lenderABefore = loanToken.balanceOf(lenderA);
        uint256 lenderBBefore = loanToken.balanceOf(lenderB);

        IBiviumRouter.RepayItem[] memory items = new IBiviumRouter.RepayItem[](2);
        items[0] = IBiviumRouter.RepayItem({params: pA, assets: 300e18, shares: 0, maxAssetsIn: 0});
        items[1] = IBiviumRouter.RepayItem({params: pB, assets: 300e18, shares: 0, maxAssetsIn: 0});

        vm.prank(borrower);
        router.repay(items);

        assertEq(loanToken.balanceOf(lenderA) - lenderABefore, 300e18, "lender A repaid");
        assertEq(loanToken.balanceOf(lenderB) - lenderBBefore, 300e18, "lender B repaid");

        (, , uint128 borrowA,,) = bivium.market(pA.id());
        (, , uint128 borrowB,,) = bivium.market(pB.id());
        assertEq(borrowA, 0, "market A cleared");
        assertEq(borrowB, 0, "market B cleared");

        assertEq(loanToken.balanceOf(address(router)), 0, "router LOAN");
    }

    // ── closePosition tests ──

    function test_closePosition_revertsIfEmptyItems() public {
        IBiviumRouter.ClosePositionItem[] memory items = new IBiviumRouter.ClosePositionItem[](0);
        vm.prank(borrower);
        vm.expectRevert(IBiviumRouter.EmptyItems.selector);
        router.closePosition(items);
    }

    function test_closePosition_revertsIfNotAuthorized() public {
        // We deliberately do NOT call setAuthorization here.
        (, MarketParams memory pA) = _setupLender(PK_A, 100, 1_000e18);

        IBiviumRouter.ClosePositionItem[] memory items = new IBiviumRouter.ClosePositionItem[](1);
        items[0] = IBiviumRouter.ClosePositionItem({
            params: pA,
            assets: 1e18,
            shares: 0,
            maxAssetsIn: 0,
            collateralAmount: 1e18
        });

        vm.prank(borrower);
        vm.expectRevert(IBiviumRouter.NotAuthorized.selector);
        router.closePosition(items);
    }

    function test_closePosition_singleMarket_fullExit() public {
        MarketParams memory pA = _openPosition(PK_A, 1_000e18, 500e18);

        vm.prank(borrower);
        loanToken.approve(address(router), 500e18);

        uint256 lenderABefore = loanToken.balanceOf(lenderA);

        IBiviumRouter.ClosePositionItem[] memory items = new IBiviumRouter.ClosePositionItem[](1);
        items[0] = IBiviumRouter.ClosePositionItem({
            params: pA,
            assets: 500e18,
            shares: 0,
            maxAssetsIn: 0,
            collateralAmount: 1_000e18
        });

        vm.prank(borrower);
        router.closePosition(items);

        // Debt cleared, collateral returned, lender repaid.
        (uint256 supplyShares, uint128 borrowShares, uint128 collateral) = bivium.position(pA.id(), borrower);
        supplyShares;
        assertEq(borrowShares, 0, "no debt");
        assertEq(collateral, 0, "no collateral in market");
        assertEq(collateralToken.balanceOf(borrower), 1_000e18, "borrower got collateral back");
        assertEq(loanToken.balanceOf(lenderA) - lenderABefore, 500e18, "lender A received");

        // Router invariants.
        assertEq(loanToken.balanceOf(address(router)), 0, "router LOAN");
        assertEq(collateralToken.balanceOf(address(router)), 0, "router COLL");
    }

    function test_closePosition_sharesMode_fullExitWithRefund() public {
        MarketParams memory pA = _openPosition(PK_A, 1_000e18, 500e18);

        (, uint128 borrowShares,) = bivium.position(pA.id(), borrower);

        // Pre-fund the borrower for a generous maxAssetsIn.
        uint256 maxIn = 600e18;
        loanToken.mint(borrower, 100e18);
        vm.prank(borrower);
        loanToken.approve(address(router), maxIn);

        uint256 borrowerLoanBefore = loanToken.balanceOf(borrower);
        uint256 lenderABefore = loanToken.balanceOf(lenderA);

        IBiviumRouter.ClosePositionItem[] memory items = new IBiviumRouter.ClosePositionItem[](1);
        items[0] = IBiviumRouter.ClosePositionItem({
            params: pA,
            assets: 0,
            shares: borrowShares,
            maxAssetsIn: maxIn,
            collateralAmount: 1_000e18
        });

        vm.prank(borrower);
        router.closePosition(items);

        // Borrower's net loan-token spent equals the actual repay (with refund).
        uint256 borrowerNet = borrowerLoanBefore - loanToken.balanceOf(borrower);
        assertApproxEqAbs(borrowerNet, 500e18, 1, "borrower paid only actual debt");

        // Collateral returned.
        assertEq(collateralToken.balanceOf(borrower), 1_000e18, "borrower got collateral back");

        // Lender received funds.
        assertApproxEqAbs(loanToken.balanceOf(lenderA) - lenderABefore, 500e18, 1, "lender A received");

        // Router stateless.
        assertEq(loanToken.balanceOf(address(router)), 0, "router LOAN");
        assertEq(collateralToken.balanceOf(address(router)), 0, "router COLL");
    }
}
