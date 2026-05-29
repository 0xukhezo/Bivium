// Minimal hand-extracted ABI for the BiviumProfile (ERC-7702 delegate).
//
// Source of truth: apps/contracts/src/BiviumProfile.sol. Because each lender's
// EOA delegates to this template via ERC-7702, the contract address used for
// these calls is the lender's OWN connected address — not a single deployed
// instance. Only the function selectors / shape matter here.
//
// Replace with the forge-extracted artifact once `apps/contracts/out/` is
// generated (`forge build`) and the indexer's `regen-abis` script is updated
// to include BiviumProfile.

export const BiviumProfileAbi = [
  // --- writes (all `onlySelf` — call via the lender's own EOA) ---
  {
    type: "function",
    name: "setRate",
    stateMutability: "nonpayable",
    inputs: [
      { name: "loanToken", type: "address" },
      { name: "ratePerSecond", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "setAllowedCollaterals",
    stateMutability: "nonpayable",
    inputs: [{ name: "collaterals", type: "address[]" }],
    outputs: [],
  },
  {
    type: "function",
    name: "addAllowedCollateral",
    stateMutability: "nonpayable",
    inputs: [{ name: "collateral", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "removeAllowedCollateral",
    stateMutability: "nonpayable",
    inputs: [{ name: "collateral", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "pause",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "unpause",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },

  // --- reads ---
  {
    type: "function",
    name: "paused",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "getRate",
    stateMutability: "view",
    inputs: [{ name: "loanToken", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getAllowedCollaterals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address[]" }],
  },
  {
    type: "function",
    name: "isCollateralAllowed",
    stateMutability: "view",
    inputs: [{ name: "collateral", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;
