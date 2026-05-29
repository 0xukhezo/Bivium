// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";

import {Bivium} from "../src/Bivium.sol";
import {TokenConfig} from "../src/interfaces/IBivium.sol";
import {EventsLib} from "../src/libraries/EventsLib.sol";

contract TokenConfigTest is Test {
    Bivium internal bivium;

    address internal collateral = makeAddr("collateral");
    address internal loan = makeAddr("loan");
    address internal oracle = makeAddr("oracle");
    uint256 internal constant LLTV = 0.86e18;

    function setUp() public {
        bivium = new Bivium(address(this));
    }

    function test_setTokenConfig_revertsIfNotOwner() public {
        vm.prank(address(0xBAD));
        vm.expectRevert(bytes("not owner"));
        bivium.setTokenConfig(collateral, loan, oracle, LLTV);
    }

    function test_setTokenConfig_revertsIfZeroCollateral() public {
        vm.expectRevert(bytes("zero address"));
        bivium.setTokenConfig(address(0), loan, oracle, LLTV);
    }

    function test_setTokenConfig_revertsIfZeroLoan() public {
        vm.expectRevert(bytes("zero address"));
        bivium.setTokenConfig(collateral, address(0), oracle, LLTV);
    }

    function test_setTokenConfig_revertsIfZeroOracle() public {
        vm.expectRevert(bytes("zero oracle"));
        bivium.setTokenConfig(collateral, loan, address(0), LLTV);
    }

    function test_setTokenConfig_revertsIfZeroLltv() public {
        vm.expectRevert(bytes("invalid lltv"));
        bivium.setTokenConfig(collateral, loan, oracle, 0);
    }

    function test_setTokenConfig_revertsIfLltvAtWad() public {
        vm.expectRevert(bytes("invalid lltv"));
        bivium.setTokenConfig(collateral, loan, oracle, 1e18);
    }

    function test_setTokenConfig_revertsIfLltvAboveWad() public {
        vm.expectRevert(bytes("invalid lltv"));
        bivium.setTokenConfig(collateral, loan, oracle, 1e18 + 1);
    }

    function test_setTokenConfig_storesAndEmits() public {
        vm.expectEmit(true, true, false, true, address(bivium));
        emit EventsLib.TokenConfigSet(collateral, loan, oracle, LLTV);
        bivium.setTokenConfig(collateral, loan, oracle, LLTV);

        TokenConfig memory cfg = bivium.getTokenConfig(collateral, loan);
        assertEq(cfg.oracle, oracle, "oracle");
        assertEq(cfg.lltv, LLTV, "lltv");
    }

    function test_setTokenConfig_overwritesExistingConfig() public {
        bivium.setTokenConfig(collateral, loan, oracle, LLTV);

        address newOracle = makeAddr("newOracle");
        uint256 newLltv = 0.77e18;
        bivium.setTokenConfig(collateral, loan, newOracle, newLltv);

        TokenConfig memory cfg = bivium.getTokenConfig(collateral, loan);
        assertEq(cfg.oracle, newOracle, "oracle");
        assertEq(cfg.lltv, newLltv, "lltv");
    }

    /// @dev The same collateral can be paired against multiple loan tokens
    ///      independently. Setting `(WBTC, USDC)` must not affect `(WBTC, WETH)`.
    function test_setTokenConfig_differentLoanTokensCoexist() public {
        address loanA = makeAddr("loanA");
        address loanB = makeAddr("loanB");
        address oracleA = makeAddr("oracleA");
        address oracleB = makeAddr("oracleB");
        uint256 lltvA = 0.86e18;
        uint256 lltvB = 0.74e18;

        bivium.setTokenConfig(collateral, loanA, oracleA, lltvA);
        bivium.setTokenConfig(collateral, loanB, oracleB, lltvB);

        TokenConfig memory cfgA = bivium.getTokenConfig(collateral, loanA);
        TokenConfig memory cfgB = bivium.getTokenConfig(collateral, loanB);

        assertEq(cfgA.oracle, oracleA, "oracleA");
        assertEq(cfgA.lltv, lltvA, "lltvA");
        assertEq(cfgB.oracle, oracleB, "oracleB");
        assertEq(cfgB.lltv, lltvB, "lltvB");
    }

    /// @dev Removing `(collateral, loanA)` must not affect `(collateral, loanB)`.
    function test_removeTokenConfig_onlyAffectsTargetPair() public {
        address loanA = makeAddr("loanA");
        address loanB = makeAddr("loanB");

        bivium.setTokenConfig(collateral, loanA, oracle, LLTV);
        bivium.setTokenConfig(collateral, loanB, oracle, LLTV);

        bivium.removeTokenConfig(collateral, loanA);

        TokenConfig memory cfgA = bivium.getTokenConfig(collateral, loanA);
        TokenConfig memory cfgB = bivium.getTokenConfig(collateral, loanB);

        assertEq(cfgA.oracle, address(0), "loanA pair must be cleared");
        assertEq(cfgB.oracle, oracle, "loanB pair must survive");
        assertEq(cfgB.lltv, LLTV, "loanB lltv must survive");
    }

    function test_removeTokenConfig_revertsIfNotOwner() public {
        bivium.setTokenConfig(collateral, loan, oracle, LLTV);

        vm.prank(address(0xBAD));
        vm.expectRevert(bytes("not owner"));
        bivium.removeTokenConfig(collateral, loan);
    }

    function test_removeTokenConfig_clearsAndEmits() public {
        bivium.setTokenConfig(collateral, loan, oracle, LLTV);

        vm.expectEmit(true, true, false, true, address(bivium));
        emit EventsLib.TokenConfigRemoved(collateral, loan);
        bivium.removeTokenConfig(collateral, loan);

        TokenConfig memory cfg = bivium.getTokenConfig(collateral, loan);
        assertEq(cfg.oracle, address(0), "oracle");
        assertEq(cfg.lltv, 0, "lltv");
    }

    function test_removeTokenConfig_isIdempotent() public {
        bivium.removeTokenConfig(collateral, loan);
        bivium.removeTokenConfig(collateral, loan);

        TokenConfig memory cfg = bivium.getTokenConfig(collateral, loan);
        assertEq(cfg.oracle, address(0), "oracle");
        assertEq(cfg.lltv, 0, "lltv");
    }

    function test_getTokenConfig_returnsZeroForUnsetPair() public {
        TokenConfig memory cfg = bivium.getTokenConfig(makeAddr("unsetCollateral"), makeAddr("unsetLoan"));
        assertEq(cfg.oracle, address(0));
        assertEq(cfg.lltv, 0);
    }
}
