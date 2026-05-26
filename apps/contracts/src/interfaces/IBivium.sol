// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.5.0;

type Id is bytes32;

/// @dev Market identity parameters. `ratePerSecond` carries the inline fixed
///      rate and `creator` identifies the sovereign lender owning the market.
///      The field order is contractual: it is hashed via assembly keccak256 in
///      `MarketParamsLib.id()` with `BYTES_LENGTH = 6 * 32`. Changing the order
///      or count without updating the lib will produce inconsistent ids.
struct MarketParams {
    address loanToken;
    address collateralToken;
    address oracle;
    uint256 ratePerSecond;
    uint256 lltv;
    address creator;
}

/// @dev User-facing input for `createMarket`. `oracle` and `lltv` are looked
///      up from the curated `tokenConfigs[collateralToken]` registry; the user
///      cannot pick them directly.
struct CreateMarketInput {
    address loanToken;
    address collateralToken;
    uint256 ratePerSecond;
    address creator;
}

/// @dev Curated config for a token. `oracle == address(0)` means the token is
///      not curated and cannot be used as collateral.
struct TokenConfig {
    address oracle;
    uint256 lltv;
}

struct Position {
    uint256 supplyShares;
    uint128 borrowShares;
    uint128 collateral;
}

struct Market {
    uint128 totalSupplyAssets;
    uint128 totalSupplyShares;
    uint128 totalBorrowAssets;
    uint128 totalBorrowShares;
    uint128 lastUpdate;
}

struct Authorization {
    address authorizer;
    address authorized;
    bool isAuthorized;
    uint256 nonce;
    uint256 deadline;
}

struct Signature {
    uint8 v;
    bytes32 r;
    bytes32 s;
}

/// @dev Factorized base interface; consider using `IBivium` instead for full
///      typed return values.
interface IBiviumBase {
    /// @notice The EIP-712 domain separator.
    function DOMAIN_SEPARATOR() external view returns (bytes32);

    /// @notice The owner of the contract.
    /// @dev Has the power to curate tokens (set/remove `tokenConfigs`) and to transfer ownership.
    function owner() external view returns (address);

    /// @notice Curated config (oracle + LLTV) for `token`. `oracle == address(0)` means not curated.
    function getTokenConfig(address token) external view returns (TokenConfig memory);

    /// @notice Whether `authorized` is authorized to modify `authorizer`'s position on all markets.
    function isAuthorized(address authorizer, address authorized) external view returns (bool);

    /// @notice The `authorizer`'s current nonce. Used to prevent replay attacks with EIP-712 signatures.
    function nonce(address authorizer) external view returns (uint256);

    /// @notice Sets `newOwner` as `owner` of the contract.
    function setOwner(address newOwner) external;

    /// @notice Curates `token` with the given oracle and LLTV.
    /// @dev Reverts on zero address, zero oracle, or `lltv == 0 || lltv >= WAD`.
    function setTokenConfig(address token, address oracle, uint256 lltv) external;

    /// @notice Removes `token` from the curated registry. Does not affect existing markets.
    function removeTokenConfig(address token) external;

    /// @notice Creates a Bivium market from `input`.
    /// @dev `msg.sender` must equal `input.creator`. `input.collateralToken` must be curated.
    function createMarket(CreateMarketInput calldata input) external;

    /// @notice Supplies `assets` or `shares` on behalf of `onBehalf`.
    /// @dev `onBehalf` MUST equal `marketParams.creator`. Bivium markets are mono-lender.
    function supply(
        MarketParams memory marketParams,
        uint256 assets,
        uint256 shares,
        address onBehalf,
        bytes memory data
    ) external returns (uint256 assetsSupplied, uint256 sharesSupplied);

    /// @notice Withdraws `assets` or `shares` on behalf of `onBehalf` and sends them to `receiver`.
    function withdraw(
        MarketParams memory marketParams,
        uint256 assets,
        uint256 shares,
        address onBehalf,
        address receiver
    ) external returns (uint256 assetsWithdrawn, uint256 sharesWithdrawn);

    /// @notice Borrows `assets` or `shares` on behalf of `onBehalf` and sends them to `receiver`.
    function borrow(
        MarketParams memory marketParams,
        uint256 assets,
        uint256 shares,
        address onBehalf,
        address receiver
    ) external returns (uint256 assetsBorrowed, uint256 sharesBorrowed);

    /// @notice Repays `assets` or `shares` on behalf of `onBehalf`. Triggers auto-forward of idle supply to creator.
    function repay(
        MarketParams memory marketParams,
        uint256 assets,
        uint256 shares,
        address onBehalf,
        bytes memory data
    ) external returns (uint256 assetsRepaid, uint256 sharesRepaid);

    /// @notice Supplies `assets` of collateral on behalf of `onBehalf`.
    function supplyCollateral(MarketParams memory marketParams, uint256 assets, address onBehalf, bytes memory data)
        external;

    /// @notice Withdraws `assets` of collateral on behalf of `onBehalf`.
    function withdrawCollateral(MarketParams memory marketParams, uint256 assets, address onBehalf, address receiver)
        external;

    /// @notice Liquidates a position. Triggers auto-forward of idle supply to creator after bad-debt absorption.
    function liquidate(
        MarketParams memory marketParams,
        address borrower,
        uint256 seizedAssets,
        uint256 repaidShares,
        bytes memory data
    ) external returns (uint256, uint256);

    /// @notice Executes a flash loan.
    function flashLoan(address token, uint256 assets, bytes calldata data) external;

    /// @notice Sets the authorization for `authorized` to manage `msg.sender`'s positions.
    function setAuthorization(address authorized, bool newIsAuthorized) external;

    /// @notice Sets the authorization for `authorization.authorized` to manage `authorization.authorizer`'s positions.
    function setAuthorizationWithSig(Authorization calldata authorization, Signature calldata signature) external;

    /// @notice Accrues interest for the given market `marketParams`.
    function accrueInterest(MarketParams memory marketParams) external;

    /// @notice Returns the data stored on the different `slots`.
    function extSloads(bytes32[] memory slots) external view returns (bytes32[] memory);
}

/// @dev This interface is inherited by Bivium so that function signatures are checked by the compiler.
interface IBiviumStaticTyping is IBiviumBase {
    function position(Id id, address user)
        external
        view
        returns (uint256 supplyShares, uint128 borrowShares, uint128 collateral);

    function market(Id id)
        external
        view
        returns (
            uint128 totalSupplyAssets,
            uint128 totalSupplyShares,
            uint128 totalBorrowAssets,
            uint128 totalBorrowShares,
            uint128 lastUpdate
        );

    function tokenConfigs(address token) external view returns (address oracle, uint256 lltv);

    function idToMarketParams(Id id)
        external
        view
        returns (
            address loanToken,
            address collateralToken,
            address oracle,
            uint256 ratePerSecond,
            uint256 lltv,
            address creator
        );
}

/// @title IBivium
/// @notice Full Bivium interface with typed struct returns.
interface IBivium is IBiviumBase {
    function position(Id id, address user) external view returns (Position memory p);
    function market(Id id) external view returns (Market memory m);
    function tokenConfigs(address token) external view returns (TokenConfig memory);
    function idToMarketParams(Id id) external view returns (MarketParams memory);
}
