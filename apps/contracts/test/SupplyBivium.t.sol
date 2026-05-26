// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BiviumBaseTest} from "./BiviumBaseTest.sol";
import {MarketParams} from "../src/interfaces/IBivium.sol";
import {MarketParamsLib} from "../src/libraries/MarketParamsLib.sol";

contract SupplyBiviumTest is BiviumBaseTest {
    using MarketParamsLib for MarketParams;

    MarketParams internal params;

    function setUp() public override {
        super.setUp();
        params = _createMarket(0);
    }

    function test_supply_revertsIfOnBehalfNotCreator() public {
        address impostor = makeAddr("impostor");

        loanToken.mint(impostor, 100e18);
        vm.startPrank(impostor);
        loanToken.approve(address(bivium), 100e18);
        vm.expectRevert(bytes("supply onBehalf must be creator"));
        bivium.supply(params, 100e18, 0, impostor, "");
        vm.stopPrank();
    }

    function test_supply_revertsIfOnBehalfIsZero() public {
        loanToken.mint(creator, 100e18);
        vm.startPrank(creator);
        loanToken.approve(address(bivium), 100e18);
        vm.expectRevert(bytes("zero address"));
        bivium.supply(params, 100e18, 0, address(0), "");
        vm.stopPrank();
    }

    function test_supply_succeedsIfOnBehalfIsCreator() public {
        loanToken.mint(creator, 100e18);
        vm.startPrank(creator);
        loanToken.approve(address(bivium), 100e18);
        bivium.supply(params, 100e18, 0, creator, "");
        vm.stopPrank();

        (uint128 totalSupplyAssets,,,,) = bivium.market(params.id());
        assertEq(totalSupplyAssets, 100e18, "supply assets");
        assertEq(loanToken.balanceOf(address(bivium)), 100e18, "bivium balance");
    }

    /// @dev `msg.sender` may be a relayer paying gas for the creator, as long as
    ///      `onBehalf == creator`. Mono-lender is enforced on `onBehalf`, not on the caller.
    function test_supply_relayerCanPayGasForCreator() public {
        address relayer = makeAddr("relayer");

        loanToken.mint(relayer, 100e18);
        vm.startPrank(relayer);
        loanToken.approve(address(bivium), 100e18);
        bivium.supply(params, 100e18, 0, creator, "");
        vm.stopPrank();

        (uint128 totalSupplyAssets, uint128 totalSupplyShares,,,) = bivium.market(params.id());
        assertEq(totalSupplyAssets, 100e18, "supply assets");
        assertGt(totalSupplyShares, 0, "supply shares");

        // Shares accrue to the creator, not the relayer.
        (uint256 creatorShares,,) = bivium.position(params.id(), creator);
        (uint256 relayerShares,,) = bivium.position(params.id(), relayer);
        assertEq(creatorShares, uint256(totalSupplyShares), "creator owns all shares");
        assertEq(relayerShares, 0, "relayer owns no shares");
    }
}
