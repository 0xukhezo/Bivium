// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, Vm} from "forge-std/Test.sol";

import {BiviumEventEmitter} from "../src/BiviumEventEmitter.sol";
import {BiviumProfile} from "../src/BiviumProfile.sol";
import {IBiviumEventEmitter} from "../src/interfaces/IBiviumEventEmitter.sol";
import {IBiviumProfile} from "../src/interfaces/IBiviumProfile.sol";
import {Id, MarketParams, CreateMarketInput} from "../src/interfaces/IBivium.sol";
import {MAX_RATE_PER_SECOND} from "../src/libraries/ConstantsLib.sol";
import {MarketParamsLib} from "../src/libraries/MarketParamsLib.sol";

import {MockBivium} from "./mocks/MockBivium.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {ReentrantToken} from "./mocks/ReentrantToken.sol";

/// @dev Unit tests for `BiviumProfile`. To exercise the EXTCODEHASH-gated
///      `BiviumEventEmitter` plumbing, every test uses an EOA delegated to the
///      Profile template via EIP-7702 (`vm.signAndAttachDelegation`), then
///      calls into the EOA as `lender`. `vm.prank(lender)` makes the
///      delegated-EOA the `msg.sender == address(this)` of the Profile
///      execution context, which is what `onlySelf` requires.
contract BiviumProfileTest is Test {
    using MarketParamsLib for MarketParams;

    BiviumProfile internal profile;
    BiviumEventEmitter internal emitter;
    MockBivium internal bivium;
    address internal router;

    MockERC20 internal usdc;
    MockERC20 internal wbtc;
    MockERC20 internal weth;
    address internal oracle;
    uint256 internal constant LLTV = 0.86e18;

    uint256 internal constant LENDER_PK = 0xA11CE;
    address internal lender;

    function setUp() public {
        bivium = new MockBivium();
        router = makeAddr("router");
        emitter = new BiviumEventEmitter();
        profile = new BiviumProfile(address(bivium), router, address(emitter));
        emitter.initialize(address(profile));

        usdc = new MockERC20("USDC", "USDC", 6);
        wbtc = new MockERC20("WBTC", "WBTC", 8);
        weth = new MockERC20("WETH", "WETH", 18);
        oracle = makeAddr("oracle");

        // All happy-path tests use USDC as the loan token; curate both
        // collaterals against it. Tests that exercise a different loan token
        // (e.g. the reentrancy test below) curate their own pair locally.
        bivium.setTokenConfig(address(wbtc), address(usdc), oracle, LLTV);
        bivium.setTokenConfig(address(weth), address(usdc), oracle, LLTV);

        lender = vm.addr(LENDER_PK);
        vm.signAndAttachDelegation(address(profile), LENDER_PK);
    }

    // ── Helpers ──

    function _arr1(address a) internal pure returns (address[] memory r) {
        r = new address[](1);
        r[0] = a;
    }

    function _arr2(address a, address b) internal pure returns (address[] memory r) {
        r = new address[](2);
        r[0] = a;
        r[1] = b;
    }

    function _params(address loan, address collateral, uint256 rate, address creator)
        internal
        view
        returns (MarketParams memory)
    {
        return MarketParams({
            loanToken: loan,
            collateralToken: collateral,
            oracle: oracle,
            ratePerSecond: rate,
            lltv: LLTV,
            creator: creator
        });
    }

    /// @dev Sets a rate + a single-collateral whitelist on the lender's EOA
    ///      and tops the EOA balance for happy-path supply.
    function _seedAndActivate(MockERC20 token, address collateral, uint256 rate) internal {
        vm.startPrank(lender);
        BiviumProfile(payable(lender)).setRate(address(token), rate);
        BiviumProfile(payable(lender)).setAllowedCollaterals(_arr1(collateral));
        vm.stopPrank();
        token.mint(lender, 1_000_000e18);
    }

    // ── Constructor ──

    function test_constructor_revertsIfZeroBivium() public {
        vm.expectRevert(bytes("zero bivium"));
        new BiviumProfile(address(0), router, address(emitter));
    }

    function test_constructor_revertsIfZeroRouter() public {
        vm.expectRevert(bytes("zero router"));
        new BiviumProfile(address(bivium), address(0), address(emitter));
    }

    function test_constructor_revertsIfZeroEmitter() public {
        vm.expectRevert(bytes("zero emitter"));
        new BiviumProfile(address(bivium), router, address(0));
    }

    // ── setRate ──

    function test_setRate_revertsIfNotSelf() public {
        vm.expectRevert(IBiviumProfile.OnlySelf.selector);
        profile.setRate(address(usdc), 100);
    }

    function test_setRate_storesAndEmits() public {
        vm.expectEmit(true, true, false, true, address(emitter));
        emit IBiviumEventEmitter.LenderRegistered(lender);
        vm.expectEmit(true, true, false, true, address(emitter));
        emit IBiviumEventEmitter.RateSet(lender, address(usdc), 42);

        vm.prank(lender);
        BiviumProfile(payable(lender)).setRate(address(usdc), 42);

        assertEq(BiviumProfile(payable(lender)).getRate(address(usdc)), 42);
    }

    function test_setRate_zeroDeactivates() public {
        vm.startPrank(lender);
        BiviumProfile(payable(lender)).setRate(address(usdc), 100);
        BiviumProfile(payable(lender)).setRate(address(usdc), 0);
        vm.stopPrank();
        assertEq(BiviumProfile(payable(lender)).getRate(address(usdc)), 0);
    }

    function test_setRate_revertsIfTooHigh() public {
        vm.prank(lender);
        vm.expectRevert(IBiviumProfile.RateTooHigh.selector);
        BiviumProfile(payable(lender)).setRate(address(usdc), MAX_RATE_PER_SECOND + 1);
    }

    function test_setRate_autoRegisters() public {
        assertFalse(emitter.registered(lender));
        vm.prank(lender);
        BiviumProfile(payable(lender)).setRate(address(usdc), 1);
        assertTrue(emitter.registered(lender));
    }

    function test_setRate_secondCallDoesNotReRegister() public {
        vm.prank(lender);
        BiviumProfile(payable(lender)).setRate(address(usdc), 1);

        // Second call: no LenderRegistered should fire.
        vm.recordLogs();
        vm.prank(lender);
        BiviumProfile(payable(lender)).setRate(address(usdc), 2);
        Vm.Log[] memory logs = vm.getRecordedLogs();

        bytes32 lenderRegisteredTopic = IBiviumEventEmitter.LenderRegistered.selector;
        for (uint256 i; i < logs.length; ++i) {
            assertTrue(logs[i].topics[0] != lenderRegisteredTopic, "should not re-register");
        }
    }

    // ── setAllowedCollaterals ──

    function test_setAllowedCollaterals_storesAndEmits() public {
        address[] memory cols = _arr2(address(wbtc), address(weth));

        vm.expectEmit(true, true, false, true, address(emitter));
        emit IBiviumEventEmitter.LenderRegistered(lender);
        vm.expectEmit(true, true, false, true, address(emitter));
        emit IBiviumEventEmitter.AllowedCollateralsSet(lender, cols);

        vm.prank(lender);
        BiviumProfile(payable(lender)).setAllowedCollaterals(cols);

        address[] memory got = BiviumProfile(payable(lender)).getAllowedCollaterals();
        assertEq(got.length, 2);
        assertEq(got[0], address(wbtc));
        assertEq(got[1], address(weth));
        assertTrue(BiviumProfile(payable(lender)).isCollateralAllowed(address(wbtc)));
        assertTrue(BiviumProfile(payable(lender)).isCollateralAllowed(address(weth)));
    }

    function test_setAllowedCollaterals_clearsOldList() public {
        vm.startPrank(lender);
        BiviumProfile(payable(lender)).setAllowedCollaterals(_arr1(address(wbtc)));
        assertTrue(BiviumProfile(payable(lender)).isCollateralAllowed(address(wbtc)));

        BiviumProfile(payable(lender)).setAllowedCollaterals(_arr1(address(weth)));
        vm.stopPrank();

        assertFalse(BiviumProfile(payable(lender)).isCollateralAllowed(address(wbtc)));
        assertTrue(BiviumProfile(payable(lender)).isCollateralAllowed(address(weth)));
        assertEq(BiviumProfile(payable(lender)).getAllowedCollaterals().length, 1);
    }

    function test_setAllowedCollaterals_revertsIfDuplicate() public {
        address[] memory cols = _arr2(address(wbtc), address(wbtc));
        vm.prank(lender);
        vm.expectRevert(abi.encodeWithSelector(IBiviumProfile.DuplicateCollateral.selector, address(wbtc)));
        BiviumProfile(payable(lender)).setAllowedCollaterals(cols);
    }

    function test_setAllowedCollaterals_revertsIfZeroAddress() public {
        address[] memory cols = _arr1(address(0));
        vm.prank(lender);
        vm.expectRevert(IBiviumProfile.ZeroAddress.selector);
        BiviumProfile(payable(lender)).setAllowedCollaterals(cols);
    }

    function test_setAllowedCollaterals_revertsIfNotSelf() public {
        vm.expectRevert(IBiviumProfile.OnlySelf.selector);
        profile.setAllowedCollaterals(_arr1(address(wbtc)));
    }

    // ── add / removeAllowedCollateral ──

    function test_addAllowedCollateral_storesAndEmits() public {
        vm.expectEmit(true, true, false, true, address(emitter));
        emit IBiviumEventEmitter.LenderRegistered(lender);
        vm.expectEmit(true, true, false, true, address(emitter));
        emit IBiviumEventEmitter.AllowedCollateralAdded(lender, address(wbtc));

        vm.prank(lender);
        BiviumProfile(payable(lender)).addAllowedCollateral(address(wbtc));
        assertTrue(BiviumProfile(payable(lender)).isCollateralAllowed(address(wbtc)));
        assertEq(BiviumProfile(payable(lender)).getAllowedCollaterals().length, 1);
    }

    function test_addAllowedCollateral_revertsIfAlreadyInList() public {
        vm.startPrank(lender);
        BiviumProfile(payable(lender)).addAllowedCollateral(address(wbtc));
        vm.expectRevert(abi.encodeWithSelector(IBiviumProfile.DuplicateCollateral.selector, address(wbtc)));
        BiviumProfile(payable(lender)).addAllowedCollateral(address(wbtc));
        vm.stopPrank();
    }

    function test_addAllowedCollateral_revertsIfZeroAddress() public {
        vm.prank(lender);
        vm.expectRevert(IBiviumProfile.ZeroAddress.selector);
        BiviumProfile(payable(lender)).addAllowedCollateral(address(0));
    }

    function test_removeAllowedCollateral_storesAndEmits() public {
        vm.startPrank(lender);
        BiviumProfile(payable(lender)).setAllowedCollaterals(_arr2(address(wbtc), address(weth)));

        vm.expectEmit(true, true, false, true, address(emitter));
        emit IBiviumEventEmitter.AllowedCollateralRemoved(lender, address(wbtc));
        BiviumProfile(payable(lender)).removeAllowedCollateral(address(wbtc));
        vm.stopPrank();

        assertFalse(BiviumProfile(payable(lender)).isCollateralAllowed(address(wbtc)));
        address[] memory got = BiviumProfile(payable(lender)).getAllowedCollaterals();
        assertEq(got.length, 1);
        assertEq(got[0], address(weth));
    }

    function test_removeAllowedCollateral_revertsIfNotInList() public {
        vm.prank(lender);
        vm.expectRevert(abi.encodeWithSelector(IBiviumProfile.CollateralNotInList.selector, address(wbtc)));
        BiviumProfile(payable(lender)).removeAllowedCollateral(address(wbtc));
    }

    // ── pause / unpause ──

    function test_pause_setsAndEmits() public {
        vm.expectEmit(true, false, false, false, address(emitter));
        emit IBiviumEventEmitter.Paused(lender);
        vm.prank(lender);
        BiviumProfile(payable(lender)).pause();
        assertTrue(BiviumProfile(payable(lender)).paused());
    }

    function test_unpause_clearsAndEmits() public {
        vm.startPrank(lender);
        BiviumProfile(payable(lender)).pause();
        vm.expectEmit(true, false, false, false, address(emitter));
        emit IBiviumEventEmitter.Unpaused(lender);
        BiviumProfile(payable(lender)).unpause();
        vm.stopPrank();
        assertFalse(BiviumProfile(payable(lender)).paused());
    }

    function test_pause_revertsIfNotSelf() public {
        vm.expectRevert(IBiviumProfile.OnlySelf.selector);
        profile.pause();
    }

    // ── withdrawFromMarket ──

    function test_withdrawFromMarket_callsBivium() public {
        usdc.mint(address(bivium), 100e6);

        MarketParams memory p = _params(address(usdc), address(wbtc), 10, lender);

        vm.expectEmit(true, true, false, true, address(emitter));
        emit IBiviumEventEmitter.WithdrawnFromMarket(lender, Id.unwrap(p.id()), 100e6);

        vm.prank(lender);
        BiviumProfile(payable(lender)).withdrawFromMarket(p, 100e6);

        assertEq(bivium.withdrawCallsLength(), 1);
        (
            MarketParams memory recordedParams,
            uint256 assets,
            uint256 shares,
            address onBehalf,
            address receiver,
            address caller
        ) = bivium.withdrawCallAt(0);
        assertEq(recordedParams.loanToken, address(usdc));
        assertEq(assets, 100e6);
        assertEq(shares, 0);
        assertEq(onBehalf, lender);
        assertEq(receiver, lender);
        assertEq(caller, lender);
    }

    function test_withdrawFromMarket_revertsIfNotSelf() public {
        MarketParams memory p = _params(address(usdc), address(wbtc), 10, lender);
        vm.expectRevert(IBiviumProfile.OnlySelf.selector);
        profile.withdrawFromMarket(p, 1);
    }

    // ── fulfillBorrow: guards ──

    function test_fulfillBorrow_revertsIfNotRouter() public {
        MarketParams memory p = _params(address(usdc), address(wbtc), 10, lender);
        vm.expectRevert(IBiviumProfile.OnlyRouter.selector);
        BiviumProfile(payable(lender)).fulfillBorrow(p, 100);
    }

    function test_fulfillBorrow_revertsIfZeroLoan() public {
        MarketParams memory p = _params(address(usdc), address(wbtc), 10, lender);
        vm.prank(router);
        vm.expectRevert(IBiviumProfile.ZeroLoanAmount.selector);
        BiviumProfile(payable(lender)).fulfillBorrow(p, 0);
    }

    function test_fulfillBorrow_revertsIfNotYourMarket() public {
        MarketParams memory p = _params(address(usdc), address(wbtc), 10, address(0xbad));
        vm.prank(router);
        vm.expectRevert(IBiviumProfile.NotYourMarket.selector);
        BiviumProfile(payable(lender)).fulfillBorrow(p, 100);
    }

    function test_fulfillBorrow_revertsIfPaused() public {
        _seedAndActivate(usdc, address(wbtc), 10);

        vm.prank(lender);
        BiviumProfile(payable(lender)).pause();

        MarketParams memory p = _params(address(usdc), address(wbtc), 10, lender);
        vm.prank(router);
        vm.expectRevert(IBiviumProfile.ProfilePaused.selector);
        BiviumProfile(payable(lender)).fulfillBorrow(p, 100);
    }

    function test_fulfillBorrow_revertsIfLoanTokenNotActive() public {
        MarketParams memory p = _params(address(usdc), address(wbtc), 10, lender);
        vm.prank(router);
        vm.expectRevert(abi.encodeWithSelector(IBiviumProfile.LoanTokenNotActive.selector, address(usdc)));
        BiviumProfile(payable(lender)).fulfillBorrow(p, 100);
    }

    function test_fulfillBorrow_revertsIfRateMismatch() public {
        _seedAndActivate(usdc, address(wbtc), 10);
        MarketParams memory p = _params(address(usdc), address(wbtc), 999, lender);

        vm.prank(router);
        vm.expectRevert(abi.encodeWithSelector(IBiviumProfile.RateMismatch.selector, uint256(999), uint256(10)));
        BiviumProfile(payable(lender)).fulfillBorrow(p, 100);
    }

    function test_fulfillBorrow_revertsIfCollateralNotAllowed() public {
        _seedAndActivate(usdc, address(wbtc), 10);
        MarketParams memory p = _params(address(usdc), address(weth), 10, lender);

        vm.prank(router);
        vm.expectRevert(abi.encodeWithSelector(IBiviumProfile.CollateralNotAllowed.selector, address(weth)));
        BiviumProfile(payable(lender)).fulfillBorrow(p, 100);
    }

    // ── fulfillBorrow: create-on-demand ──

    function test_fulfillBorrow_createsMarketOnFirstCall() public {
        _seedAndActivate(usdc, address(wbtc), 10);
        MarketParams memory p = _params(address(usdc), address(wbtc), 10, lender);

        // Pre-condition: no market exists.
        assertEq(bivium.createMarketCallsLength(), 0);

        vm.expectEmit(true, true, false, true, address(emitter));
        emit IBiviumEventEmitter.MarketCreated(lender, Id.unwrap(p.id()), address(usdc), address(wbtc), 10);

        vm.prank(router);
        BiviumProfile(payable(lender)).fulfillBorrow(p, 100);

        assertEq(bivium.createMarketCallsLength(), 1);
        (address loan, address col, uint256 rate, address creator) = bivium.createMarketCalls(0);
        assertEq(loan, address(usdc));
        assertEq(col, address(wbtc));
        assertEq(rate, 10);
        assertEq(creator, lender);
    }

    function test_fulfillBorrow_reusesExistingMarketOnSecondCall() public {
        _seedAndActivate(usdc, address(wbtc), 10);
        MarketParams memory p = _params(address(usdc), address(wbtc), 10, lender);

        vm.prank(router);
        BiviumProfile(payable(lender)).fulfillBorrow(p, 100);
        assertEq(bivium.createMarketCallsLength(), 1);

        vm.recordLogs();
        vm.prank(router);
        BiviumProfile(payable(lender)).fulfillBorrow(p, 100);

        // No second createMarket call.
        assertEq(bivium.createMarketCallsLength(), 1);
        // No MarketCreated event on the second call.
        bytes32 marketCreatedTopic = IBiviumEventEmitter.MarketCreated.selector;
        Vm.Log[] memory logs = vm.getRecordedLogs();
        for (uint256 i; i < logs.length; ++i) {
            assertTrue(logs[i].topics[0] != marketCreatedTopic, "should not re-create market");
        }
    }

    // ── fulfillBorrow: happy path ──

    function test_fulfillBorrow_supplyReachesBivium() public {
        _seedAndActivate(usdc, address(wbtc), 10);
        MarketParams memory p = _params(address(usdc), address(wbtc), 10, lender);

        uint256 beforeBalance = usdc.balanceOf(lender);

        vm.expectEmit(true, true, false, true, address(emitter));
        emit IBiviumEventEmitter.FulfilledBorrow(lender, Id.unwrap(p.id()), 100);

        vm.prank(router);
        BiviumProfile(payable(lender)).fulfillBorrow(p, 100);

        assertEq(bivium.supplyCallsLength(), 1);
        (
            MarketParams memory recordedParams,
            uint256 assets,
            uint256 shares,
            address onBehalf,
            bytes memory data,
            address caller
        ) = bivium.supplyCallAt(0);
        assertEq(recordedParams.loanToken, address(usdc));
        assertEq(assets, 100);
        assertEq(shares, 0);
        assertEq(onBehalf, lender);
        assertEq(data.length, 0);
        assertEq(caller, lender);

        assertEq(usdc.balanceOf(lender), beforeBalance - 100);
        assertEq(usdc.balanceOf(address(bivium)), 100);
        assertEq(usdc.allowance(lender, address(bivium)), 0);
    }

    // ── reentrancy ──

    function test_fulfillBorrow_nonReentrant() public {
        ReentrantToken bad = new ReentrantToken();
        bad.mint(lender, 1_000e18);

        bivium.setTokenConfig(address(wbtc), address(bad), oracle, LLTV);

        vm.startPrank(lender);
        BiviumProfile(payable(lender)).setRate(address(bad), 10);
        BiviumProfile(payable(lender)).setAllowedCollaterals(_arr1(address(wbtc)));
        vm.stopPrank();

        MarketParams memory p = MarketParams({
            loanToken: address(bad),
            collateralToken: address(wbtc),
            oracle: oracle,
            ratePerSecond: 10,
            lltv: LLTV,
            creator: lender
        });

        bytes memory reenterCall = abi.encodeWithSelector(BiviumProfile.fulfillBorrow.selector, p, uint256(50));
        bad.arm(lender, reenterCall);

        vm.prank(router);
        vm.expectRevert(bytes("approve reverted"));
        BiviumProfile(payable(lender)).fulfillBorrow(p, 100);
    }

    function test_fulfillBorrow_supplyRevertsBubblesUp() public {
        _seedAndActivate(usdc, address(wbtc), 10);
        MarketParams memory p = _params(address(usdc), address(wbtc), 10, lender);

        bivium.setRevertOnSupply(true);

        vm.prank(router);
        vm.expectRevert(bytes("MockBivium: forced revert"));
        BiviumProfile(payable(lender)).fulfillBorrow(p, 100);

        assertEq(usdc.allowance(lender, address(bivium)), 0);
    }

    // ── _safeApprove edge cases ──

    function test_safeApprove_handlesNoBoolReturn() public {
        _seedAndActivate(usdc, address(wbtc), 10);
        usdc.setForceNoBoolReturn(true);

        MarketParams memory p = _params(address(usdc), address(wbtc), 10, lender);

        vm.prank(router);
        BiviumProfile(payable(lender)).fulfillBorrow(p, 100);

        assertEq(bivium.supplyCallsLength(), 1);
    }

    function test_safeApprove_handlesFalseReturn() public {
        _seedAndActivate(usdc, address(wbtc), 10);
        usdc.setForceApproveFalse(true);

        MarketParams memory p = _params(address(usdc), address(wbtc), 10, lender);

        vm.prank(router);
        vm.expectRevert(bytes("approve returned false"));
        BiviumProfile(payable(lender)).fulfillBorrow(p, 100);
    }
}
