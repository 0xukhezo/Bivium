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
import {Id, MarketParams} from "../../src/interfaces/IBivium.sol";
import {MarketParamsLib} from "../../src/libraries/MarketParamsLib.sol";

import {MockERC20} from "../mocks/MockERC20.sol";
import {MockOracle} from "../mocks/MockOracle.sol";

/// @dev End-to-end orderbook suite for `BiviumRouter.borrow(BorrowOrder)`:
///      real `Bivium`, real `BiviumRouter`, real `BiviumProfile` template,
///      lender EOAs delegated via ERC-7702. The test contract is the Bivium
///      owner so it can curate the collateral token.
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
    uint256 internal constant WAD = 1e18;
    /// @dev Both tokens 18-decimals → oracle scale = 1e36 (1 collateral == 1 loan).
    uint256 internal constant ORACLE_PRICE = 1e36;

    uint256 internal constant PK_A = 0xA;
    uint256 internal constant PK_B = 0xB;
    uint256 internal constant PK_C = 0xC;
    address internal lenderA;
    address internal lenderB;
    address internal lenderC;

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

        bivium.setTokenConfig(address(collateralToken), address(loanToken), address(oracle), LLTV);

        lenderA = vm.addr(PK_A);
        lenderB = vm.addr(PK_B);
        lenderC = vm.addr(PK_C);
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

    function _fill(address creator, uint256 rate) internal pure returns (IBiviumRouter.BorrowFill memory) {
        return IBiviumRouter.BorrowFill({creator: creator, ratePerSecond: rate});
    }

    function _order(
        uint256 loanAmount,
        uint256 collateralAmount,
        uint256 maxAvgRate,
        uint256 minHF,
        IBiviumRouter.BorrowFill[] memory candidates
    ) internal view returns (IBiviumRouter.BorrowOrder memory) {
        return IBiviumRouter.BorrowOrder({
            loanToken: address(loanToken),
            collateralToken: address(collateralToken),
            loanAmount: loanAmount,
            collateralAmount: collateralAmount,
            maxAvgRatePerSecond: maxAvgRate,
            minHealthFactor: minHF,
            candidates: candidates
        });
    }

    /// @dev Default health factor used in tests that don't care about the buffer.
    function _defaultMinHF() internal pure returns (uint256) {
        return WAD; // 1.0x — exactly at the LLTV boundary
    }

    /// @dev Generous `maxAvgRate` used in tests that don't care about slippage.
    function _generousMaxRate() internal pure returns (uint256) {
        return type(uint128).max;
    }

    // ────────────────────────────────────────────────────────────
    // Borrow — input validation
    // ────────────────────────────────────────────────────────────

    function test_borrow_revertsIfEmptyCandidates() public {
        _authorizeAndApprove(0);

        IBiviumRouter.BorrowFill[] memory candidates = new IBiviumRouter.BorrowFill[](0);
        IBiviumRouter.BorrowOrder memory order = _order(0, 0, _generousMaxRate(), _defaultMinHF(), candidates);

        vm.prank(borrower);
        vm.expectRevert(IBiviumRouter.EmptyCandidates.selector);
        router.borrow(order);
    }

    function test_borrow_revertsIfZeroLoanAmount() public {
        (, MarketParams memory pA) = _setupLender(PK_A, 100, 1_000e18);
        pA;

        _authorizeAndApprove(100e18);
        IBiviumRouter.BorrowFill[] memory candidates = new IBiviumRouter.BorrowFill[](1);
        candidates[0] = _fill(lenderA, 100);
        IBiviumRouter.BorrowOrder memory order = _order(0, 100e18, _generousMaxRate(), _defaultMinHF(), candidates);

        vm.prank(borrower);
        vm.expectRevert(IBiviumRouter.InconsistentInput.selector);
        router.borrow(order);
    }

    function test_borrow_revertsIfZeroCollateralAmount() public {
        (, MarketParams memory pA) = _setupLender(PK_A, 100, 1_000e18);
        pA;

        _authorizeAndApprove(0);
        IBiviumRouter.BorrowFill[] memory candidates = new IBiviumRouter.BorrowFill[](1);
        candidates[0] = _fill(lenderA, 100);
        IBiviumRouter.BorrowOrder memory order = _order(50e18, 0, _generousMaxRate(), _defaultMinHF(), candidates);

        vm.prank(borrower);
        vm.expectRevert(IBiviumRouter.InconsistentInput.selector);
        router.borrow(order);
    }

    function test_borrow_revertsIfUnsafeHealthFactor() public {
        (, MarketParams memory pA) = _setupLender(PK_A, 100, 1_000e18);
        pA;

        _authorizeAndApprove(100e18);
        IBiviumRouter.BorrowFill[] memory candidates = new IBiviumRouter.BorrowFill[](1);
        candidates[0] = _fill(lenderA, 100);
        // minHF < WAD (1.0) → unsafe; the contract refuses ratios under 1.0
        IBiviumRouter.BorrowOrder memory order = _order(50e18, 100e18, _generousMaxRate(), WAD - 1, candidates);

        vm.prank(borrower);
        vm.expectRevert(IBiviumRouter.UnsafeHealthFactor.selector);
        router.borrow(order);
    }

    function test_borrow_revertsIfUnsupportedCollateral() public {
        // A collateral token that was never registered via `setTokenConfig`.
        MockERC20 fakeColl = new MockERC20("FAKE", "FAKE", 18);
        (, MarketParams memory pA) = _setupLender(PK_A, 100, 1_000e18);
        pA;

        fakeColl.mint(borrower, 1_000e18);
        vm.prank(borrower);
        bivium.setAuthorization(address(router), true);
        vm.prank(borrower);
        fakeColl.approve(address(router), 1_000e18);

        IBiviumRouter.BorrowFill[] memory candidates = new IBiviumRouter.BorrowFill[](1);
        candidates[0] = _fill(lenderA, 100);
        IBiviumRouter.BorrowOrder memory order = IBiviumRouter.BorrowOrder({
            loanToken: address(loanToken),
            collateralToken: address(fakeColl),
            loanAmount: 100e18,
            collateralAmount: 1_000e18,
            maxAvgRatePerSecond: _generousMaxRate(),
            minHealthFactor: _defaultMinHF(),
            candidates: candidates
        });

        vm.prank(borrower);
        vm.expectRevert(IBiviumRouter.UnsupportedCollateral.selector);
        router.borrow(order);
    }

    function test_borrow_revertsIfBorrowerNotAuthorized() public {
        // No setAuthorization call.
        (, MarketParams memory pA) = _setupLender(PK_A, 100, 1_000e18);
        pA;

        IBiviumRouter.BorrowFill[] memory candidates = new IBiviumRouter.BorrowFill[](1);
        candidates[0] = _fill(lenderA, 100);
        IBiviumRouter.BorrowOrder memory order = _order(50e18, 100e18, _generousMaxRate(), _defaultMinHF(), candidates);

        vm.prank(borrower);
        vm.expectRevert(IBiviumRouter.NotAuthorized.selector);
        router.borrow(order);
    }

    function test_borrow_revertsIfHealthFactorTooLow() public {
        (, MarketParams memory pA) = _setupLender(PK_A, 100, 1_000e18);
        pA;

        // LLTV = 0.86; loan == collateral with minHF = WAD ⇒ loan > 86% of value.
        uint256 collateral = 100e18;
        uint256 loan = 100e18;
        _authorizeAndApprove(collateral);

        IBiviumRouter.BorrowFill[] memory candidates = new IBiviumRouter.BorrowFill[](1);
        candidates[0] = _fill(lenderA, 100);
        IBiviumRouter.BorrowOrder memory order =
            _order(loan, collateral, _generousMaxRate(), _defaultMinHF(), candidates);

        vm.prank(borrower);
        vm.expectRevert(IBiviumRouter.HealthFactorTooLow.selector);
        router.borrow(order);
    }

    function test_borrow_revertsIfHealthFactorTooLowAtBuffer() public {
        // Even though the loan would be healthy at LLTV (loan == 80% of value),
        // requesting a 1.5x buffer (minHF = 1.5e18) tightens the cap such that
        // the same loan now breaches the borrower's chosen safety margin.
        (, MarketParams memory pA) = _setupLender(PK_A, 100, 1_000e18);
        pA;

        uint256 collateral = 100e18;
        uint256 loan = 80e18; // healthy at 86% LLTV
        _authorizeAndApprove(collateral);

        IBiviumRouter.BorrowFill[] memory candidates = new IBiviumRouter.BorrowFill[](1);
        candidates[0] = _fill(lenderA, 100);
        IBiviumRouter.BorrowOrder memory order = _order(loan, collateral, _generousMaxRate(), 1.5e18, candidates);

        vm.prank(borrower);
        vm.expectRevert(IBiviumRouter.HealthFactorTooLow.selector);
        router.borrow(order);
    }

    // ────────────────────────────────────────────────────────────
    // Borrow — happy paths
    // ────────────────────────────────────────────────────────────

    function test_borrow_singleLender_happyPath() public {
        (, MarketParams memory pA) = _setupLender(PK_A, 100, 1_000e18);
        pA;

        uint256 collateral = 1_000e18;
        uint256 loan = 500e18;
        _authorizeAndApprove(collateral);

        IBiviumRouter.BorrowFill[] memory candidates = new IBiviumRouter.BorrowFill[](1);
        candidates[0] = _fill(lenderA, 100);
        IBiviumRouter.BorrowOrder memory order =
            _order(loan, collateral, _generousMaxRate(), _defaultMinHF(), candidates);

        vm.prank(borrower);
        router.borrow(order);

        // Borrower received the loan, gave up the collateral.
        assertEq(loanToken.balanceOf(borrower), loan, "borrower got loan");
        assertEq(collateralToken.balanceOf(borrower), 0, "borrower gave up collateral");
        // Lender A's wallet now holds 500 less LOAN (JIT supply flowed through Bivium to the borrower).
        assertEq(loanToken.balanceOf(lenderA), 1_000e18 - loan, "lender A wallet decreased");
        // Bivium holds the collateral. JIT model: no loan tokens sit in Bivium.
        assertEq(collateralToken.balanceOf(address(bivium)), collateral, "bivium holds collateral");
        assertEq(loanToken.balanceOf(address(bivium)), 0, "bivium holds no loan");
        // Router is stateless.
        assertEq(loanToken.balanceOf(address(router)), 0, "router zero LOAN");
        assertEq(collateralToken.balanceOf(address(router)), 0, "router zero COLL");
    }

    function test_borrow_threeFills_weightedAvgRate() public {
        // Three lenders at distinct rates. Each capped to 100 LOAN of balance so
        // the Router takes exactly 100 from each.
        // WAVG = (100*100 + 100*200 + 100*300) / 300 = 200.
        _setupLender(PK_A, 100, 100e18);
        _setupLender(PK_B, 200, 100e18);
        _setupLender(PK_C, 300, 100e18);

        uint256 collateral = 600e18;
        uint256 loan = 300e18;
        _authorizeAndApprove(collateral);

        IBiviumRouter.BorrowFill[] memory candidates = new IBiviumRouter.BorrowFill[](3);
        candidates[0] = _fill(lenderA, 100);
        candidates[1] = _fill(lenderB, 200);
        candidates[2] = _fill(lenderC, 300);
        IBiviumRouter.BorrowOrder memory order =
            _order(loan, collateral, _generousMaxRate(), _defaultMinHF(), candidates);

        vm.expectEmit(true, true, true, true, address(router));
        emit IBiviumRouter.OrderFilled(borrower, address(loanToken), address(collateralToken), loan, collateral, 200, 3);

        vm.prank(borrower);
        router.borrow(order);

        // Each lender contributed 100, all balances drained.
        assertEq(loanToken.balanceOf(lenderA), 0, "lender A drained");
        assertEq(loanToken.balanceOf(lenderB), 0, "lender B drained");
        assertEq(loanToken.balanceOf(lenderC), 0, "lender C drained");
        // Borrower received the full loan.
        assertEq(loanToken.balanceOf(borrower), loan, "borrower full loan");
    }

    function test_borrow_skipsLenderWithZeroBalance() public {
        // Lender A has zero LOAN; the Router must skip and try lender B.
        _setupLender(PK_A, 100, 0);
        _setupLender(PK_B, 200, 1_000e18);

        uint256 collateral = 500e18;
        uint256 loan = 200e18;
        _authorizeAndApprove(collateral);

        IBiviumRouter.BorrowFill[] memory candidates = new IBiviumRouter.BorrowFill[](2);
        candidates[0] = _fill(lenderA, 100);
        candidates[1] = _fill(lenderB, 200);
        IBiviumRouter.BorrowOrder memory order =
            _order(loan, collateral, _generousMaxRate(), _defaultMinHF(), candidates);

        vm.prank(borrower);
        router.borrow(order);

        // Lender A untouched, lender B provided everything.
        assertEq(loanToken.balanceOf(lenderA), 0, "A untouched");
        assertEq(loanToken.balanceOf(lenderB), 1_000e18 - loan, "B provided loan");
        assertEq(loanToken.balanceOf(borrower), loan, "borrower full loan");
    }

    function test_borrow_skipsPausedLender() public {
        // Lender A pauses before the borrow → fulfillBorrow reverts → skip → lender B fills.
        _setupLender(PK_A, 100, 1_000e18);
        _setupLender(PK_B, 200, 1_000e18);

        vm.prank(lenderA);
        BiviumProfile(payable(lenderA)).pause();

        uint256 collateral = 500e18;
        uint256 loan = 200e18;
        _authorizeAndApprove(collateral);

        IBiviumRouter.BorrowFill[] memory candidates = new IBiviumRouter.BorrowFill[](2);
        candidates[0] = _fill(lenderA, 100);
        candidates[1] = _fill(lenderB, 200);
        IBiviumRouter.BorrowOrder memory order =
            _order(loan, collateral, _generousMaxRate(), _defaultMinHF(), candidates);

        vm.prank(borrower);
        router.borrow(order);

        // Paused lender untouched, the other filled.
        assertEq(loanToken.balanceOf(lenderA), 1_000e18, "A untouched (paused)");
        assertEq(loanToken.balanceOf(lenderB), 1_000e18 - loan, "B filled");
        assertEq(loanToken.balanceOf(borrower), loan, "borrower full loan");
    }

    function test_borrow_skipsRateMismatch() public {
        // The frontend's quote for lender A says rate=100, but lender A has
        // since changed their rate to 200. fulfillBorrow detects the mismatch
        // and reverts → the Router skips and lender B fills.
        _setupLender(PK_A, 100, 1_000e18);
        _setupLender(PK_B, 300, 1_000e18);

        // Lender A bumps their rate after the quote was taken.
        vm.prank(lenderA);
        BiviumProfile(payable(lenderA)).setRate(address(loanToken), 200);

        uint256 collateral = 500e18;
        uint256 loan = 200e18;
        _authorizeAndApprove(collateral);

        IBiviumRouter.BorrowFill[] memory candidates = new IBiviumRouter.BorrowFill[](2);
        candidates[0] = _fill(lenderA, 100); // stale rate
        candidates[1] = _fill(lenderB, 300);
        IBiviumRouter.BorrowOrder memory order =
            _order(loan, collateral, _generousMaxRate(), _defaultMinHF(), candidates);

        vm.prank(borrower);
        router.borrow(order);

        assertEq(loanToken.balanceOf(lenderA), 1_000e18, "A untouched (stale rate)");
        assertEq(loanToken.balanceOf(lenderB), 1_000e18 - loan, "B filled");
        assertEq(loanToken.balanceOf(borrower), loan, "borrower full loan");
    }

    function test_borrow_revertsInsufficientLiquidity() public {
        // Lender A has 50 LOAN, lender B has 50 LOAN; borrower wants 200.
        _setupLender(PK_A, 100, 50e18);
        _setupLender(PK_B, 200, 50e18);

        uint256 collateral = 500e18;
        uint256 loan = 200e18;
        _authorizeAndApprove(collateral);

        IBiviumRouter.BorrowFill[] memory candidates = new IBiviumRouter.BorrowFill[](2);
        candidates[0] = _fill(lenderA, 100);
        candidates[1] = _fill(lenderB, 200);
        IBiviumRouter.BorrowOrder memory order =
            _order(loan, collateral, _generousMaxRate(), _defaultMinHF(), candidates);

        vm.prank(borrower);
        vm.expectRevert(IBiviumRouter.InsufficientLiquidity.selector);
        router.borrow(order);
    }

    function test_borrow_revertsSlippageExceeded() public {
        // Two candidates: A at rate 100 (with 0 balance), B at rate 500 (full balance).
        // Effective WAVG ends up = 500 because A gets skipped. maxAvgRate = 300 → revert.
        _setupLender(PK_A, 100, 0);
        _setupLender(PK_B, 500, 1_000e18);

        uint256 collateral = 500e18;
        uint256 loan = 200e18;
        _authorizeAndApprove(collateral);

        IBiviumRouter.BorrowFill[] memory candidates = new IBiviumRouter.BorrowFill[](2);
        candidates[0] = _fill(lenderA, 100);
        candidates[1] = _fill(lenderB, 500);
        IBiviumRouter.BorrowOrder memory order = _order(loan, collateral, 300, _defaultMinHF(), candidates);

        vm.prank(borrower);
        vm.expectRevert(IBiviumRouter.SlippageExceeded.selector);
        router.borrow(order);
    }

    function test_borrow_createsMarketOnFirstCall() public {
        (, MarketParams memory pA) = _setupLender(PK_A, 100, 1_000e18);

        // Pre-condition: market does not exist yet (Profile creates on demand).
        (uint128 supplyAssetsBefore,,,, uint128 lastUpdateBefore) = bivium.market(pA.id());
        assertEq(supplyAssetsBefore, 0, "market not created yet");
        assertEq(lastUpdateBefore, 0, "lastUpdate must be 0 before borrow");

        _authorizeAndApprove(1_000e18);

        IBiviumRouter.BorrowFill[] memory candidates = new IBiviumRouter.BorrowFill[](1);
        candidates[0] = _fill(lenderA, 100);
        IBiviumRouter.BorrowOrder memory order =
            _order(500e18, 1_000e18, _generousMaxRate(), _defaultMinHF(), candidates);

        vm.expectEmit(true, true, false, true, address(emitter));
        emit IBiviumEventEmitter.MarketCreated(
            lenderA, Id.unwrap(pA.id()), address(loanToken), address(collateralToken), 100
        );

        vm.prank(borrower);
        router.borrow(order);

        (,,,, uint128 lastUpdateAfter) = bivium.market(pA.id());
        assertGt(lastUpdateAfter, 0, "market created on demand");
    }

    function test_borrow_routerStatelessAfterCall() public {
        _setupLender(PK_A, 100, 1_000e18);
        _setupLender(PK_B, 200, 1_000e18);

        _authorizeAndApprove(1_200e18);

        IBiviumRouter.BorrowFill[] memory candidates = new IBiviumRouter.BorrowFill[](2);
        candidates[0] = _fill(lenderA, 100);
        candidates[1] = _fill(lenderB, 200);
        IBiviumRouter.BorrowOrder memory order =
            _order(600e18, 1_200e18, _generousMaxRate(), _defaultMinHF(), candidates);

        vm.prank(borrower);
        router.borrow(order);

        // Invariant: stateless Router → zero balance and zero allowance after success.
        assertEq(loanToken.balanceOf(address(router)), 0, "router LOAN");
        assertEq(collateralToken.balanceOf(address(router)), 0, "router COLL");
        assertEq(collateralToken.allowance(address(router), address(bivium)), 0, "router allowance reset");
    }

    function test_borrow_emitsFillPerLender() public {
        // Cap lender A's balance to 100 so the Router fills exactly 100 from A
        // and the remaining 100 from B.
        _setupLender(PK_A, 100, 100e18);
        _setupLender(PK_B, 200, 1_000e18);

        uint256 collateral = 400e18;
        uint256 loan = 200e18;
        _authorizeAndApprove(collateral);

        IBiviumRouter.BorrowFill[] memory candidates = new IBiviumRouter.BorrowFill[](2);
        candidates[0] = _fill(lenderA, 100);
        candidates[1] = _fill(lenderB, 200);
        IBiviumRouter.BorrowOrder memory order =
            _order(loan, collateral, _generousMaxRate(), _defaultMinHF(), candidates);

        vm.expectEmit(true, true, false, true, address(router));
        emit IBiviumRouter.Fill(borrower, lenderA, address(loanToken), 100e18, 100);
        vm.expectEmit(true, true, false, true, address(router));
        emit IBiviumRouter.Fill(borrower, lenderB, address(loanToken), 100e18, 200);

        vm.prank(borrower);
        router.borrow(order);
    }

    // ────────────────────────────────────────────────────────────
    // Repay tests — `_openPosition` rebuilt on the BorrowOrder API
    // ────────────────────────────────────────────────────────────

    /// @dev Opens a single-lender position with `pk` lender at rate 1 (so debt
    ///      stays nearly equal to principal in the same block). Returns the
    ///      canonical params.
    function _openPosition(uint256 pk, uint256 collateralAmount, uint256 loanAmount)
        internal
        returns (MarketParams memory params)
    {
        (address lender, MarketParams memory p) = _setupLender(pk, 1, loanAmount);
        params = p;

        _authorizeAndApprove(collateralAmount);

        IBiviumRouter.BorrowFill[] memory candidates = new IBiviumRouter.BorrowFill[](1);
        candidates[0] = _fill(lender, 1);
        IBiviumRouter.BorrowOrder memory order =
            _order(loanAmount, collateralAmount, _generousMaxRate(), _defaultMinHF(), candidates);

        vm.prank(borrower);
        router.borrow(order);
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

        vm.prank(borrower);
        loanToken.approve(address(router), 500e18);

        uint256 lenderABefore = loanToken.balanceOf(lenderA);

        IBiviumRouter.RepayItem[] memory items = new IBiviumRouter.RepayItem[](1);
        items[0] = IBiviumRouter.RepayItem({params: pA, assets: 500e18, shares: 0, maxAssetsIn: 0});

        vm.prank(borrower);
        router.repay(items);

        (uint128 supplyA,, uint128 borrowA,,) = bivium.market(pA.id());
        assertEq(borrowA, 0, "no debt");
        assertEq(supplyA, 0, "supply drained by auto-forward");
        assertEq(loanToken.balanceOf(lenderA) - lenderABefore, 500e18, "lender A received");

        assertEq(loanToken.balanceOf(address(router)), 0, "router LOAN");
        assertEq(loanToken.allowance(address(router), address(bivium)), 0, "router-bivium allowance");
    }

    function test_repay_sharesMode_refundsResidual() public {
        MarketParams memory pA = _openPosition(PK_A, 1_000e18, 500e18);

        (, uint128 borrowShares,) = bivium.position(pA.id(), borrower);
        assertGt(borrowShares, 0, "has debt");

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

        uint256 borrowerNet = borrowerBefore - loanToken.balanceOf(borrower);
        assertApproxEqAbs(borrowerNet, 500e18, 1, "borrower paid only the actual debt");
        assertApproxEqAbs(loanToken.balanceOf(lenderA) - lenderABefore, 500e18, 1, "lender A received");

        (uint128 supplyA,, uint128 borrowA,,) = bivium.market(pA.id());
        assertEq(borrowA, 0, "no debt");
        assertEq(supplyA, 0, "supply drained by auto-forward");

        assertEq(loanToken.balanceOf(address(router)), 0, "router LOAN");
        assertEq(loanToken.allowance(address(router), address(bivium)), 0, "router-bivium allowance");
    }

    function test_repay_multiMarket_atomic() public {
        MarketParams memory pA = _openPosition(PK_A, 600e18, 300e18);

        // Open a second position with lender B without re-running the full setup helper.
        (, MarketParams memory pB) = _setupLender(PK_B, 1, 300e18);
        collateralToken.mint(borrower, 600e18);
        vm.prank(borrower);
        collateralToken.approve(address(router), 600e18);

        IBiviumRouter.BorrowFill[] memory candidatesB = new IBiviumRouter.BorrowFill[](1);
        candidatesB[0] = _fill(lenderB, 1);
        IBiviumRouter.BorrowOrder memory orderB =
            _order(300e18, 600e18, _generousMaxRate(), _defaultMinHF(), candidatesB);

        vm.prank(borrower);
        router.borrow(orderB);

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

        (,, uint128 borrowA,,) = bivium.market(pA.id());
        (,, uint128 borrowB,,) = bivium.market(pB.id());
        assertEq(borrowA, 0, "market A cleared");
        assertEq(borrowB, 0, "market B cleared");

        assertEq(loanToken.balanceOf(address(router)), 0, "router LOAN");
    }

    // ────────────────────────────────────────────────────────────
    // closePosition tests
    // ────────────────────────────────────────────────────────────

    function test_closePosition_revertsIfEmptyItems() public {
        IBiviumRouter.ClosePositionItem[] memory items = new IBiviumRouter.ClosePositionItem[](0);
        vm.prank(borrower);
        vm.expectRevert(IBiviumRouter.EmptyItems.selector);
        router.closePosition(items);
    }

    function test_closePosition_revertsIfNotAuthorized() public {
        (, MarketParams memory pA) = _setupLender(PK_A, 100, 1_000e18);

        IBiviumRouter.ClosePositionItem[] memory items = new IBiviumRouter.ClosePositionItem[](1);
        items[0] = IBiviumRouter.ClosePositionItem({
            params: pA, assets: 1e18, shares: 0, maxAssetsIn: 0, collateralAmount: 1e18
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
            params: pA, assets: 500e18, shares: 0, maxAssetsIn: 0, collateralAmount: 1_000e18
        });

        vm.prank(borrower);
        router.closePosition(items);

        (, uint128 borrowShares, uint128 collateral) = bivium.position(pA.id(), borrower);
        assertEq(borrowShares, 0, "no debt");
        assertEq(collateral, 0, "no collateral in market");
        assertEq(collateralToken.balanceOf(borrower), 1_000e18, "borrower got collateral back");
        assertEq(loanToken.balanceOf(lenderA) - lenderABefore, 500e18, "lender A received");

        assertEq(loanToken.balanceOf(address(router)), 0, "router LOAN");
        assertEq(collateralToken.balanceOf(address(router)), 0, "router COLL");
    }

    function test_closePosition_sharesMode_fullExitWithRefund() public {
        MarketParams memory pA = _openPosition(PK_A, 1_000e18, 500e18);

        (, uint128 borrowShares,) = bivium.position(pA.id(), borrower);

        uint256 maxIn = 600e18;
        loanToken.mint(borrower, 100e18);
        vm.prank(borrower);
        loanToken.approve(address(router), maxIn);

        uint256 borrowerLoanBefore = loanToken.balanceOf(borrower);
        uint256 lenderABefore = loanToken.balanceOf(lenderA);

        IBiviumRouter.ClosePositionItem[] memory items = new IBiviumRouter.ClosePositionItem[](1);
        items[0] = IBiviumRouter.ClosePositionItem({
            params: pA, assets: 0, shares: borrowShares, maxAssetsIn: maxIn, collateralAmount: 1_000e18
        });

        vm.prank(borrower);
        router.closePosition(items);

        uint256 borrowerNet = borrowerLoanBefore - loanToken.balanceOf(borrower);
        assertApproxEqAbs(borrowerNet, 500e18, 1, "borrower paid only actual debt");

        assertEq(collateralToken.balanceOf(borrower), 1_000e18, "borrower got collateral back");
        assertApproxEqAbs(loanToken.balanceOf(lenderA) - lenderABefore, 500e18, 1, "lender A received");

        assertEq(loanToken.balanceOf(address(router)), 0, "router LOAN");
        assertEq(collateralToken.balanceOf(address(router)), 0, "router COLL");
    }
}
