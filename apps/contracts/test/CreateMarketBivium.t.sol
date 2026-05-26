// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BiviumBaseTest} from "./BiviumBaseTest.sol";
import {Id, MarketParams, CreateMarketInput} from "../src/interfaces/IBivium.sol";
import {MarketParamsLib} from "../src/libraries/MarketParamsLib.sol";
import {MAX_RATE_PER_SECOND} from "../src/libraries/ConstantsLib.sol";

contract CreateMarketBiviumTest is BiviumBaseTest {
    using MarketParamsLib for MarketParams;

    function test_createMarket_revertsIfCreatorNotSender() public {
        CreateMarketInput memory input = _input(0);
        vm.prank(makeAddr("notCreator"));
        vm.expectRevert(bytes("not creator"));
        bivium.createMarket(input);
    }

    function test_createMarket_revertsIfRateTooHigh() public {
        CreateMarketInput memory input = _input(MAX_RATE_PER_SECOND + 1);
        vm.prank(creator);
        vm.expectRevert(bytes("rate too high"));
        bivium.createMarket(input);
    }

    function test_createMarket_acceptsMaxRate() public {
        vm.prank(creator);
        bivium.createMarket(_input(MAX_RATE_PER_SECOND));
        (,,,, uint128 lastUpdate) = bivium.market(_idOf(MAX_RATE_PER_SECOND));
        assertGt(lastUpdate, 0, "market should exist");
    }

    function test_createMarket_revertsIfCollateralNotCurated() public {
        // Use a fresh collateral address that has not been curated.
        address uncurated = makeAddr("uncuratedCollateral");
        CreateMarketInput memory input = CreateMarketInput({
            loanToken: address(loanToken),
            collateralToken: uncurated,
            ratePerSecond: 0,
            creator: creator
        });
        vm.prank(creator);
        vm.expectRevert(bytes("collateral not curated"));
        bivium.createMarket(input);
    }

    function test_createMarket_storesParamsWithOracleAndLltvFromRegistry() public {
        vm.prank(creator);
        bivium.createMarket(_input(123));

        Id id = _idOf(123);
        (
            address storedLoan,
            address storedCollateral,
            address storedOracle,
            uint256 storedRate,
            uint256 storedLltv,
            address storedCreator
        ) = bivium.idToMarketParams(id);

        assertEq(storedLoan, address(loanToken), "loan");
        assertEq(storedCollateral, address(collateralToken), "collateral");
        assertEq(storedOracle, address(oracle), "oracle (from registry)");
        assertEq(storedRate, 123, "rate (from input)");
        assertEq(storedLltv, LLTV, "lltv (from registry)");
        assertEq(storedCreator, creator, "creator");
    }

    function test_createMarket_idMatchesKeccakOfStruct() public view {
        MarketParams memory p = _params(987);
        bytes32 expected = keccak256(abi.encode(p));
        assertEq(Id.unwrap(p.id()), expected, "id must equal keccak of encoded struct");
    }

    function test_createMarket_twoCreatorsWithSameOtherParamsGetDifferentIds() public {
        address creatorA = makeAddr("creatorA");
        address creatorB = makeAddr("creatorB");

        vm.prank(creatorA);
        bivium.createMarket(CreateMarketInput({
            loanToken: address(loanToken),
            collateralToken: address(collateralToken),
            ratePerSecond: 42,
            creator: creatorA
        }));
        vm.prank(creatorB);
        bivium.createMarket(CreateMarketInput({
            loanToken: address(loanToken),
            collateralToken: address(collateralToken),
            ratePerSecond: 42,
            creator: creatorB
        }));

        MarketParams memory pA = MarketParams({
            loanToken: address(loanToken),
            collateralToken: address(collateralToken),
            oracle: address(oracle),
            ratePerSecond: 42,
            lltv: LLTV,
            creator: creatorA
        });
        MarketParams memory pB = MarketParams({
            loanToken: address(loanToken),
            collateralToken: address(collateralToken),
            oracle: address(oracle),
            ratePerSecond: 42,
            lltv: LLTV,
            creator: creatorB
        });

        assertTrue(Id.unwrap(pA.id()) != Id.unwrap(pB.id()), "ids must differ by creator");

        (,,,, uint128 lastA) = bivium.market(pA.id());
        (,,,, uint128 lastB) = bivium.market(pB.id());
        assertGt(lastA, 0, "A should exist");
        assertGt(lastB, 0, "B should exist");
    }

    function test_createMarket_sameCreatorTwiceFails() public {
        vm.prank(creator);
        bivium.createMarket(_input(7));

        vm.prank(creator);
        vm.expectRevert(bytes("market already created"));
        bivium.createMarket(_input(7));
    }

    function test_createMarket_differentRateMakesDifferentMarket() public {
        vm.prank(creator);
        bivium.createMarket(_input(1));

        vm.prank(creator);
        bivium.createMarket(_input(2));

        (,,,, uint128 last1) = bivium.market(_idOf(1));
        (,,,, uint128 last2) = bivium.market(_idOf(2));
        assertGt(last1, 0, "rate=1 market");
        assertGt(last2, 0, "rate=2 market");
    }
}
