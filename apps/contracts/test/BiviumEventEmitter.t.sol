// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, Vm} from "forge-std/Test.sol";

import {BiviumEventEmitter} from "../src/BiviumEventEmitter.sol";
import {BiviumProfile} from "../src/BiviumProfile.sol";
import {IBiviumEventEmitter} from "../src/interfaces/IBiviumEventEmitter.sol";

import {MockBivium} from "./mocks/MockBivium.sol";

/// @dev Minimal contract with non-7702 code, used to test that a regular
///      contract caller (not an EOA with the 7702 indirection) fails the
///      EXTCODEHASH gate.
contract NotADelegate {
    function poke(address target) external {
        BiviumEventEmitter(target).emitPaused();
    }
}

contract BiviumEventEmitterTest is Test {
    BiviumEventEmitter internal emitter;
    BiviumProfile internal profile;
    BiviumProfile internal otherProfile;
    MockBivium internal bivium;
    address internal router;

    uint256 internal constant LENDER_PK = 0xA11CE;
    address internal lender;

    uint256 internal constant OTHER_PK = 0xB0B;
    address internal other;

    function setUp() public {
        bivium = new MockBivium();
        router = makeAddr("router");

        emitter = new BiviumEventEmitter();
        profile = new BiviumProfile(address(bivium), router, address(emitter));
        // Second template (used to test "delegated to a DIFFERENT address" rejection)
        otherProfile = new BiviumProfile(address(bivium), router, address(emitter));

        lender = vm.addr(LENDER_PK);
        other = vm.addr(OTHER_PK);
    }

    // ── constructor ──

    function test_constructor_setsDeployer() public {
        BiviumEventEmitter fresh = new BiviumEventEmitter();
        assertEq(fresh.DEPLOYER(), address(this));
        assertFalse(fresh.initialized());
    }

    // ── initialize ──

    function test_initialize_storesAndEmits() public {
        BiviumEventEmitter fresh = new BiviumEventEmitter();

        bytes32 expectedHash = keccak256(abi.encodePacked(hex"ef0100", address(profile)));

        vm.expectEmit(true, false, false, true, address(fresh));
        emit IBiviumEventEmitter.Initialized(address(profile), expectedHash);

        fresh.initialize(address(profile));

        assertTrue(fresh.initialized());
        assertEq(fresh.profileTemplate(), address(profile));
        assertEq(fresh.expectedProfileCodehash(), expectedHash);
    }

    function test_initialize_revertsIfNotDeployer() public {
        BiviumEventEmitter fresh = new BiviumEventEmitter();
        vm.prank(other);
        vm.expectRevert(IBiviumEventEmitter.OnlyDeployer.selector);
        fresh.initialize(address(profile));
    }

    function test_initialize_revertsIfAlreadyInitialized() public {
        emitter.initialize(address(profile));
        vm.expectRevert(IBiviumEventEmitter.AlreadyInitialized.selector);
        emitter.initialize(address(profile));
    }

    // ── gating ──

    function test_emit_revertsIfNotInitialized() public {
        // No initialize. Even a properly-delegated EOA fails because the
        // expected codehash is still zero (≠ EXTCODEHASH of the EOA).
        vm.signAndAttachDelegation(address(profile), LENDER_PK);
        vm.prank(lender);
        vm.expectRevert(IBiviumEventEmitter.NotInitialized.selector);
        emitter.emitRateSet(address(0xdead), 1);
    }

    function test_emit_revertsIfNotDelegatedEOA() public {
        emitter.initialize(address(profile));
        // `lender` here is a plain EOA — no delegation set.
        vm.prank(lender);
        vm.expectRevert(IBiviumEventEmitter.NotAProfile.selector);
        emitter.emitRateSet(address(0xdead), 1);
    }

    function test_emit_revertsIfDelegatedToOtherAddress() public {
        emitter.initialize(address(profile));
        // Delegate `lender` to a DIFFERENT contract → wrong codehash.
        vm.signAndAttachDelegation(address(otherProfile), LENDER_PK);
        vm.prank(lender);
        vm.expectRevert(IBiviumEventEmitter.NotAProfile.selector);
        emitter.emitRateSet(address(0xdead), 1);
    }

    function test_emit_revertsIfContractCaller() public {
        emitter.initialize(address(profile));
        NotADelegate npc = new NotADelegate();
        vm.expectRevert(IBiviumEventEmitter.NotAProfile.selector);
        npc.poke(address(emitter));
    }

    // ── emitRegister ──

    function test_emitRegister_marksAndEmits() public {
        emitter.initialize(address(profile));
        vm.signAndAttachDelegation(address(profile), LENDER_PK);

        assertFalse(emitter.registered(lender));

        vm.expectEmit(true, false, false, false, address(emitter));
        emit IBiviumEventEmitter.LenderRegistered(lender);
        vm.prank(lender);
        emitter.emitRegister();

        assertTrue(emitter.registered(lender));
    }

    function test_emitRegister_isIdempotent() public {
        emitter.initialize(address(profile));
        vm.signAndAttachDelegation(address(profile), LENDER_PK);

        vm.prank(lender);
        emitter.emitRegister();

        vm.recordLogs();
        vm.prank(lender);
        emitter.emitRegister();
        Vm.Log[] memory logs = vm.getRecordedLogs();
        // Second call MUST NOT emit LenderRegistered again.
        assertEq(logs.length, 0);
    }

    function test_emitRegister_perCaller() public {
        emitter.initialize(address(profile));
        vm.signAndAttachDelegation(address(profile), LENDER_PK);
        vm.signAndAttachDelegation(address(profile), OTHER_PK);

        vm.prank(lender);
        emitter.emitRegister();
        vm.prank(other);
        emitter.emitRegister();

        assertTrue(emitter.registered(lender));
        assertTrue(emitter.registered(other));
    }

    // ── emit forwarding ──

    function test_emitRateSet_emitsWithMsgSenderAsLender() public {
        emitter.initialize(address(profile));
        vm.signAndAttachDelegation(address(profile), LENDER_PK);

        vm.expectEmit(true, true, false, true, address(emitter));
        emit IBiviumEventEmitter.RateSet(lender, address(0xC0FFEE), 42);
        vm.prank(lender);
        emitter.emitRateSet(address(0xC0FFEE), 42);
    }

    function test_emitAllowedCollateralsSet_carriesArrayCorrectly() public {
        emitter.initialize(address(profile));
        vm.signAndAttachDelegation(address(profile), LENDER_PK);

        address[] memory cols = new address[](2);
        cols[0] = address(0xAA);
        cols[1] = address(0xBB);

        vm.expectEmit(true, false, false, true, address(emitter));
        emit IBiviumEventEmitter.AllowedCollateralsSet(lender, cols);
        vm.prank(lender);
        emitter.emitAllowedCollateralsSet(cols);
    }

    function test_emitPaused_andUnpaused() public {
        emitter.initialize(address(profile));
        vm.signAndAttachDelegation(address(profile), LENDER_PK);

        vm.expectEmit(true, false, false, false, address(emitter));
        emit IBiviumEventEmitter.Paused(lender);
        vm.prank(lender);
        emitter.emitPaused();

        vm.expectEmit(true, false, false, false, address(emitter));
        emit IBiviumEventEmitter.Unpaused(lender);
        vm.prank(lender);
        emitter.emitUnpaused();
    }

    function test_emitMarketCreated_emitsAllFields() public {
        emitter.initialize(address(profile));
        vm.signAndAttachDelegation(address(profile), LENDER_PK);

        bytes32 id = bytes32(uint256(0xabc));
        vm.expectEmit(true, true, false, true, address(emitter));
        emit IBiviumEventEmitter.MarketCreated(lender, id, address(0xAA), address(0xBB), 99);
        vm.prank(lender);
        emitter.emitMarketCreated(id, address(0xAA), address(0xBB), 99);
    }

    function test_emitFulfilledBorrow_emits() public {
        emitter.initialize(address(profile));
        vm.signAndAttachDelegation(address(profile), LENDER_PK);

        bytes32 id = bytes32(uint256(0xabc));
        vm.expectEmit(true, true, false, true, address(emitter));
        emit IBiviumEventEmitter.FulfilledBorrow(lender, id, 1_000);
        vm.prank(lender);
        emitter.emitFulfilledBorrow(id, 1_000);
    }

    function test_emitWithdrawnFromMarket_emits() public {
        emitter.initialize(address(profile));
        vm.signAndAttachDelegation(address(profile), LENDER_PK);

        bytes32 id = bytes32(uint256(0xabc));
        vm.expectEmit(true, true, false, true, address(emitter));
        emit IBiviumEventEmitter.WithdrawnFromMarket(lender, id, 500);
        vm.prank(lender);
        emitter.emitWithdrawnFromMarket(id, 500);
    }

    // ── residual spam vector ──

    /// @dev Documents the residual spam vector: an EOA delegated to the
    ///      canonical Profile template can call `Emitter.emitX(...)` directly
    ///      (bypassing the Profile's own state checks). On-chain we accept
    ///      this; the indexer mitigates it off-chain by cross-checking event
    ///      contents against the Profile's read views.
    function test_residualSpamVector_designIntent() public {
        emitter.initialize(address(profile));
        vm.signAndAttachDelegation(address(profile), LENDER_PK);

        // The lender's Profile rate for USDC is still 0 (never set), yet the
        // delegated EOA can still emit a fabricated RateSet event.
        assertEq(BiviumProfile(payable(lender)).getRate(address(0xC0FFEE)), 0);

        vm.expectEmit(true, true, false, true, address(emitter));
        emit IBiviumEventEmitter.RateSet(lender, address(0xC0FFEE), 99_999);
        vm.prank(lender);
        emitter.emitRateSet(address(0xC0FFEE), 99_999);
    }
}
