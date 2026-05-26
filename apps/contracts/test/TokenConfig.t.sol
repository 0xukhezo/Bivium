// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";

import {Bivium} from "../src/Bivium.sol";
import {TokenConfig} from "../src/interfaces/IBivium.sol";
import {EventsLib} from "../src/libraries/EventsLib.sol";

contract TokenConfigTest is Test {
    Bivium internal bivium;

    address internal token = makeAddr("token");
    address internal oracle = makeAddr("oracle");
    uint256 internal constant LLTV = 0.86e18;

    function setUp() public {
        bivium = new Bivium(address(this));
    }

    function test_setTokenConfig_revertsIfNotOwner() public {
        vm.prank(address(0xBAD));
        vm.expectRevert(bytes("not owner"));
        bivium.setTokenConfig(token, oracle, LLTV);
    }

    function test_setTokenConfig_revertsIfZeroToken() public {
        vm.expectRevert(bytes("zero address"));
        bivium.setTokenConfig(address(0), oracle, LLTV);
    }

    function test_setTokenConfig_revertsIfZeroOracle() public {
        vm.expectRevert(bytes("zero oracle"));
        bivium.setTokenConfig(token, address(0), LLTV);
    }

    function test_setTokenConfig_revertsIfZeroLltv() public {
        vm.expectRevert(bytes("invalid lltv"));
        bivium.setTokenConfig(token, oracle, 0);
    }

    function test_setTokenConfig_revertsIfLltvAtWad() public {
        vm.expectRevert(bytes("invalid lltv"));
        bivium.setTokenConfig(token, oracle, 1e18);
    }

    function test_setTokenConfig_revertsIfLltvAboveWad() public {
        vm.expectRevert(bytes("invalid lltv"));
        bivium.setTokenConfig(token, oracle, 1e18 + 1);
    }

    function test_setTokenConfig_storesAndEmits() public {
        vm.expectEmit(true, false, false, true, address(bivium));
        emit EventsLib.TokenConfigSet(token, oracle, LLTV);
        bivium.setTokenConfig(token, oracle, LLTV);

        TokenConfig memory cfg = bivium.getTokenConfig(token);
        assertEq(cfg.oracle, oracle, "oracle");
        assertEq(cfg.lltv, LLTV, "lltv");
    }

    function test_setTokenConfig_overwritesExistingConfig() public {
        bivium.setTokenConfig(token, oracle, LLTV);

        address newOracle = makeAddr("newOracle");
        uint256 newLltv = 0.77e18;
        bivium.setTokenConfig(token, newOracle, newLltv);

        TokenConfig memory cfg = bivium.getTokenConfig(token);
        assertEq(cfg.oracle, newOracle, "oracle");
        assertEq(cfg.lltv, newLltv, "lltv");
    }

    function test_removeTokenConfig_revertsIfNotOwner() public {
        bivium.setTokenConfig(token, oracle, LLTV);

        vm.prank(address(0xBAD));
        vm.expectRevert(bytes("not owner"));
        bivium.removeTokenConfig(token);
    }

    function test_removeTokenConfig_clearsAndEmits() public {
        bivium.setTokenConfig(token, oracle, LLTV);

        vm.expectEmit(true, false, false, true, address(bivium));
        emit EventsLib.TokenConfigRemoved(token);
        bivium.removeTokenConfig(token);

        TokenConfig memory cfg = bivium.getTokenConfig(token);
        assertEq(cfg.oracle, address(0), "oracle");
        assertEq(cfg.lltv, 0, "lltv");
    }

    function test_removeTokenConfig_isIdempotent() public {
        bivium.removeTokenConfig(token);
        bivium.removeTokenConfig(token);

        TokenConfig memory cfg = bivium.getTokenConfig(token);
        assertEq(cfg.oracle, address(0), "oracle");
        assertEq(cfg.lltv, 0, "lltv");
    }

    function test_getTokenConfig_returnsZeroForUnsetToken() public {
        TokenConfig memory cfg = bivium.getTokenConfig(makeAddr("unset"));
        assertEq(cfg.oracle, address(0));
        assertEq(cfg.lltv, 0);
    }
}
