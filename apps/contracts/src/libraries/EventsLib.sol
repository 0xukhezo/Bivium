// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.24;

import {Id, MarketParams} from "../interfaces/IBivium.sol";

/// @title EventsLib
/// @notice Library exposing events.
library EventsLib {
    /// @notice Emitted when setting a new owner.
    event SetOwner(address indexed newOwner);

    /// @notice Emitted when curating a token (oracle + LLTV pair) in the registry.
    event TokenConfigSet(address indexed token, address oracle, uint256 lltv);

    /// @notice Emitted when removing a token from the registry.
    event TokenConfigRemoved(address indexed token);

    /// @notice Emitted when creating a market.
    /// @param id The market id.
    /// @param marketParams The market that was created.
    event CreateMarket(Id indexed id, MarketParams marketParams);

    /// @notice Emitted on supply of assets.
    event Supply(Id indexed id, address indexed caller, address indexed onBehalf, uint256 assets, uint256 shares);

    /// @notice Emitted on withdrawal of assets.
    event Withdraw(
        Id indexed id,
        address caller,
        address indexed onBehalf,
        address indexed receiver,
        uint256 assets,
        uint256 shares
    );

    /// @notice Emitted on borrow of assets.
    event Borrow(
        Id indexed id,
        address caller,
        address indexed onBehalf,
        address indexed receiver,
        uint256 assets,
        uint256 shares
    );

    /// @notice Emitted on repayment of assets.
    event Repay(Id indexed id, address indexed caller, address indexed onBehalf, uint256 assets, uint256 shares);

    /// @notice Emitted on supply of collateral.
    event SupplyCollateral(Id indexed id, address indexed caller, address indexed onBehalf, uint256 assets);

    /// @notice Emitted on withdrawal of collateral.
    event WithdrawCollateral(
        Id indexed id, address caller, address indexed onBehalf, address indexed receiver, uint256 assets
    );

    /// @notice Emitted on liquidation of a position.
    event Liquidate(
        Id indexed id,
        address indexed caller,
        address indexed borrower,
        uint256 repaidAssets,
        uint256 repaidShares,
        uint256 seizedAssets,
        uint256 badDebtAssets,
        uint256 badDebtShares
    );

    /// @notice Emitted on auto-forward of idle supply to the creator after a repay or liquidate.
    /// @param id The market id.
    /// @param creator The market creator that received the funds.
    /// @param amount The amount of loan token transferred to the creator.
    event AutoForward(Id indexed id, address indexed creator, uint256 amount);

    /// @notice Emitted on flash loan.
    event FlashLoan(address indexed caller, address indexed token, uint256 assets);

    /// @notice Emitted when setting an authorization.
    event SetAuthorization(
        address indexed caller, address indexed authorizer, address indexed authorized, bool newIsAuthorized
    );

    /// @notice Emitted when setting an authorization with a signature.
    event IncrementNonce(address indexed caller, address indexed authorizer, uint256 usedNonce);

    /// @notice Emitted when accruing interest.
    /// @param id The market id.
    /// @param borrowRate The borrow rate per second used for the accrual.
    /// @param interest The amount of interest accrued.
    event AccrueInterest(Id indexed id, uint256 borrowRate, uint256 interest);
}
