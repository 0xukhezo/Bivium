// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";

import {BiviumEventEmitter} from "../../src/BiviumEventEmitter.sol";
import {BiviumProfile} from "../../src/BiviumProfile.sol";
import {IBiviumEventEmitter} from "../../src/interfaces/IBiviumEventEmitter.sol";
import {IBiviumProfile} from "../../src/interfaces/IBiviumProfile.sol";
import {Id, MarketParams, CreateMarketInput} from "../../src/interfaces/IBivium.sol";
import {MarketParamsLib} from "../../src/libraries/MarketParamsLib.sol";

import {MockBivium} from "../mocks/MockBivium.sol";
import {MockERC20} from "../mocks/MockERC20.sol";

contract Profile7702Test is Test {
    using MarketParamsLib for MarketParams;

    BiviumProfile internal profileImpl;
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
        profileImpl = new BiviumProfile(address(bivium), router, address(emitter));
        emitter.initialize(address(profileImpl));

        usdc = new MockERC20("USDC", "USDC", 6);
        wbtc = new MockERC20("WBTC", "WBTC", 8);
        weth = new MockERC20("WETH", "WETH", 18);
        oracle = makeAddr("oracle");

        bivium.setTokenConfig(address(wbtc), address(usdc), oracle, LLTV);
        bivium.setTokenConfig(address(weth), address(usdc), oracle, LLTV);

        lender = vm.addr(LENDER_PK);
    }

    // ── Helpers ──

    function _activateLender(uint256 pk) internal {
        vm.signAndAttachDelegation(address(profileImpl), pk);
    }

    function _arr1(address a) internal pure returns (address[] memory r) {
        r = new address[](1);
        r[0] = a;
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

    // ── Tests ──

    function test7702_setRate_storageLivesInEOA() public {
        _activateLender(LENDER_PK);

        vm.prank(lender);
        BiviumProfile(payable(lender)).setRate(address(usdc), 100);

        assertEq(BiviumProfile(payable(lender)).getRate(address(usdc)), 100);

        // The template does NOT carry the lender's state.
        assertEq(profileImpl.getRate(address(usdc)), 0);
    }

    function test7702_setAllowedCollaterals_storageLivesInEOA() public {
        _activateLender(LENDER_PK);

        vm.prank(lender);
        BiviumProfile(payable(lender)).setAllowedCollaterals(_arr1(address(wbtc)));

        address[] memory cols = BiviumProfile(payable(lender)).getAllowedCollaterals();
        assertEq(cols.length, 1);
        assertEq(cols[0], address(wbtc));

        // Template is empty.
        assertEq(profileImpl.getAllowedCollaterals().length, 0);
    }

    function test7702_fulfillBorrow_createsMarketAsLender() public {
        _activateLender(LENDER_PK);

        vm.startPrank(lender);
        BiviumProfile(payable(lender)).setRate(address(usdc), 50);
        BiviumProfile(payable(lender)).setAllowedCollaterals(_arr1(address(wbtc)));
        vm.stopPrank();
        usdc.mint(lender, 1_000e6);

        MarketParams memory p = _params(address(usdc), address(wbtc), 50, lender);

        vm.prank(router);
        BiviumProfile(payable(lender)).fulfillBorrow(p, 500e6);

        assertEq(bivium.createMarketCallsLength(), 1);
        (,,, address creator) = bivium.createMarketCalls(0);
        assertEq(creator, lender, "market creator is lender's EOA");
    }

    function test7702_fulfillBorrow_consumesLenderBalance() public {
        _activateLender(LENDER_PK);

        vm.startPrank(lender);
        BiviumProfile(payable(lender)).setRate(address(usdc), 10);
        BiviumProfile(payable(lender)).setAllowedCollaterals(_arr1(address(wbtc)));
        vm.stopPrank();

        usdc.mint(lender, 1_000e6);

        MarketParams memory p = _params(address(usdc), address(wbtc), 10, lender);

        uint256 beforeLender = usdc.balanceOf(lender);
        uint256 beforeBivium = usdc.balanceOf(address(bivium));

        vm.prank(router);
        BiviumProfile(payable(lender)).fulfillBorrow(p, 500e6);

        assertEq(usdc.balanceOf(lender), beforeLender - 500e6);
        assertEq(usdc.balanceOf(address(bivium)), beforeBivium + 500e6);

        (, uint256 assets,, address onBehalf,, address caller) = bivium.supplyCallAt(0);
        assertEq(assets, 500e6);
        assertEq(onBehalf, lender);
        assertEq(caller, lender);
    }

    function test7702_fulfillBorrow_approveIsInLenderContext() public {
        _activateLender(LENDER_PK);

        vm.startPrank(lender);
        BiviumProfile(payable(lender)).setRate(address(usdc), 10);
        BiviumProfile(payable(lender)).setAllowedCollaterals(_arr1(address(wbtc)));
        vm.stopPrank();

        usdc.mint(lender, 1_000e6);

        MarketParams memory p = _params(address(usdc), address(wbtc), 10, lender);

        vm.prank(router);
        BiviumProfile(payable(lender)).fulfillBorrow(p, 500e6);

        assertEq(usdc.allowance(lender, address(bivium)), 0);
        assertEq(usdc.allowance(address(profileImpl), address(bivium)), 0);
    }

    function test7702_revoke_makesEOAInert() public {
        _activateLender(LENDER_PK);

        assertGt(lender.code.length, 0);

        vm.signAndAttachDelegation(address(0), LENDER_PK);
        assertEq(lender.code.length, 0);

        vm.prank(lender);
        (bool ok,) = lender.call(abi.encodeWithSelector(BiviumProfile.setRate.selector, address(usdc), uint256(1)));
        // With no code, the call returns true with empty returndata — not a
        // revert — but it does NOT execute as a Profile.
        assertTrue(ok);
    }

    function test7702_storagePersistsAfterRevoke() public {
        _activateLender(LENDER_PK);

        vm.prank(lender);
        BiviumProfile(payable(lender)).setRate(address(usdc), 42);

        vm.signAndAttachDelegation(address(0), LENDER_PK);
        assertEq(lender.code.length, 0);

        _activateLender(LENDER_PK);

        assertEq(BiviumProfile(payable(lender)).getRate(address(usdc)), 42);
    }

    function test7702_multiLenders_isolated() public {
        uint256 pkA = 0xA;
        uint256 pkB = 0xB;
        uint256 pkC = 0xC;
        address lA = vm.addr(pkA);
        address lB = vm.addr(pkB);
        address lC = vm.addr(pkC);

        _activateLender(pkA);
        vm.startPrank(lA);
        BiviumProfile(payable(lA)).setRate(address(usdc), 1);
        BiviumProfile(payable(lA)).setAllowedCollaterals(_arr1(address(wbtc)));
        vm.stopPrank();

        _activateLender(pkB);
        vm.startPrank(lB);
        BiviumProfile(payable(lB)).setRate(address(usdc), 99);
        BiviumProfile(payable(lB)).setAllowedCollaterals(_arr1(address(weth)));
        vm.stopPrank();

        _activateLender(pkC);
        // Lender C does not set anything.

        assertEq(BiviumProfile(payable(lA)).getRate(address(usdc)), 1);
        assertEq(BiviumProfile(payable(lA)).getAllowedCollaterals()[0], address(wbtc));

        assertEq(BiviumProfile(payable(lB)).getRate(address(usdc)), 99);
        assertEq(BiviumProfile(payable(lB)).getAllowedCollaterals()[0], address(weth));

        assertEq(BiviumProfile(payable(lC)).getRate(address(usdc)), 0);
        assertEq(BiviumProfile(payable(lC)).getAllowedCollaterals().length, 0);
    }

    /// @dev Validates the ERC-7201 namespacing guarantee: after a lender
    ///      writes both a rate and a collateral list, the canonical sequential
    ///      slots (0, 1, 2) of the EOA remain zero, and the namespaced struct
    ///      lives under the `bivium.BiviumProfile` base slot.
    function test7702_erc7201_namespacedSlotsAreUsed() public {
        _activateLender(LENDER_PK);

        vm.startPrank(lender);
        BiviumProfile(payable(lender)).setRate(address(usdc), 100);
        BiviumProfile(payable(lender)).setAllowedCollaterals(_arr1(address(wbtc)));
        BiviumProfile(payable(lender)).pause();
        vm.stopPrank();

        // Canonical sequential slots untouched.
        assertEq(vm.load(lender, bytes32(uint256(0))), bytes32(0), "slot 0 must be empty");
        assertEq(vm.load(lender, bytes32(uint256(1))), bytes32(0), "slot 1 must be empty");
        assertEq(vm.load(lender, bytes32(uint256(2))), bytes32(0), "slot 2 must be empty");
        assertEq(vm.load(lender, bytes32(uint256(3))), bytes32(0), "slot 3 must be empty");

        // Namespaced layout for `BiviumProfileStorage`:
        //   slot+0: rates mapping (mapping base; concrete entries hashed away)
        //   slot+1: allowedCollaterals dynamic array → length sits at base
        //   slot+2: isAllowedCollateral mapping
        //   slot+3: paused (bool)
        bytes32 base = 0x925d5aaaef69b0d07ee40aba75bbaf00303921136910000dc52bda3b3c6c8500;
        bytes32 allowedLen = vm.load(lender, bytes32(uint256(base) + 1));
        assertEq(uint256(allowedLen), 1, "allowedCollaterals length must live at slot+1");

        bytes32 pausedSlot = vm.load(lender, bytes32(uint256(base) + 3));
        assertEq(uint256(pausedSlot), 1, "paused bool must live at slot+3");
    }

    function test7702_routerCanTriggerFulfill() public {
        _activateLender(LENDER_PK);

        vm.startPrank(lender);
        BiviumProfile(payable(lender)).setRate(address(usdc), 10);
        BiviumProfile(payable(lender)).setAllowedCollaterals(_arr1(address(wbtc)));
        vm.stopPrank();

        usdc.mint(lender, 1_000e6);

        MarketParams memory p = _params(address(usdc), address(wbtc), 10, lender);

        vm.expectEmit(true, true, false, true, address(emitter));
        emit IBiviumEventEmitter.FulfilledBorrow(lender, Id.unwrap(p.id()), 200e6);

        vm.prank(router);
        BiviumProfile(payable(lender)).fulfillBorrow(p, 200e6);

        assertEq(usdc.balanceOf(lender), 800e6);
    }
}
