// Minimal Morpho-style oracle interface. Bivium markets reference one
// oracle per market via `MarketParams.oracle`. The oracle returns a price
// scaled by 1e36 such that:
//
//   collateral_in_loan_units = collateral_base_units × price / 1e36
//
// which already folds in the decimal differences between the two tokens.
//
// We only need `price()` for live HF computation — no other functions are
// used today.
export const IOracleAbi = [
  {
    type: "function",
    name: "price",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;
