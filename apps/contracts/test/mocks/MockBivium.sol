// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Id, Market, MarketParams, CreateMarketInput, TokenConfig} from "../../src/interfaces/IBivium.sol";
import {MarketParamsLib} from "../../src/libraries/MarketParamsLib.sol";

interface IERC20Minimal {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/// @dev Mock of the Bivium fork for isolated tests. Records every invocation
///      and replicates the pull-via-allowance pattern the real fork will use
///      when `Bivium.supply` performs `transferFrom(onBehalf, ...)`.
contract MockBivium {
    using MarketParamsLib for MarketParams;

    mapping(address => TokenConfig) internal _configs;
    /// @dev Tracks whether a market with this id has been created (so the
    ///      Profile's create-on-demand branch can detect existing markets).
    mapping(Id => Market) internal _markets;

    CreateMarketInput[] public createMarketCalls;

    struct SupplyCall {
        MarketParams params;
        uint256 assets;
        uint256 shares;
        address onBehalf;
        bytes data;
        address caller;
    }

    struct WithdrawCall {
        MarketParams params;
        uint256 assets;
        uint256 shares;
        address onBehalf;
        address receiver;
        address caller;
    }

    SupplyCall[] internal _supplyCalls;
    WithdrawCall[] internal _withdrawCalls;

    bool public revertOnSupply;

    function setTokenConfig(address token, address oracle, uint256 lltv) external {
        _configs[token] = TokenConfig({oracle: oracle, lltv: lltv});
    }

    function setRevertOnSupply(bool v) external {
        revertOnSupply = v;
    }

    function getTokenConfig(address token) external view returns (TokenConfig memory) {
        return _configs[token];
    }

    function createMarket(CreateMarketInput calldata input) external {
        createMarketCalls.push(input);
        TokenConfig memory cfg = _configs[input.collateralToken];
        MarketParams memory p = MarketParams({
            loanToken: input.loanToken,
            collateralToken: input.collateralToken,
            oracle: cfg.oracle,
            ratePerSecond: input.ratePerSecond,
            lltv: cfg.lltv,
            creator: input.creator
        });
        Id id = p.id();
        _markets[id].lastUpdate = uint128(block.timestamp == 0 ? 1 : block.timestamp);
    }

    function createMarketCallsLength() external view returns (uint256) {
        return createMarketCalls.length;
    }

    function market(Id id) external view returns (Market memory) {
        return _markets[id];
    }

    function supply(MarketParams calldata p, uint256 assets, uint256 shares, address onBehalf, bytes calldata data)
        external
        returns (uint256, uint256)
    {
        if (revertOnSupply) revert("MockBivium: forced revert");
        _supplyCalls.push(
            SupplyCall({params: p, assets: assets, shares: shares, onBehalf: onBehalf, data: data, caller: msg.sender})
        );
        IERC20Minimal(p.loanToken).transferFrom(onBehalf, address(this), assets);
        return (assets, 0);
    }

    function supplyCallsLength() external view returns (uint256) {
        return _supplyCalls.length;
    }

    function supplyCallAt(uint256 i)
        external
        view
        returns (
            MarketParams memory params,
            uint256 assets,
            uint256 shares,
            address onBehalf,
            bytes memory data,
            address caller
        )
    {
        SupplyCall storage c = _supplyCalls[i];
        return (c.params, c.assets, c.shares, c.onBehalf, c.data, c.caller);
    }

    function withdraw(MarketParams calldata p, uint256 assets, uint256 shares, address onBehalf, address receiver)
        external
        returns (uint256, uint256)
    {
        _withdrawCalls.push(
            WithdrawCall({
                params: p,
                assets: assets,
                shares: shares,
                onBehalf: onBehalf,
                receiver: receiver,
                caller: msg.sender
            })
        );
        IERC20Minimal(p.loanToken).transfer(receiver, assets);
        return (assets, 0);
    }

    function withdrawCallsLength() external view returns (uint256) {
        return _withdrawCalls.length;
    }

    function withdrawCallAt(uint256 i)
        external
        view
        returns (
            MarketParams memory params,
            uint256 assets,
            uint256 shares,
            address onBehalf,
            address receiver,
            address caller
        )
    {
        WithdrawCall storage c = _withdrawCalls[i];
        return (c.params, c.assets, c.shares, c.onBehalf, c.receiver, c.caller);
    }
}
