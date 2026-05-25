# Bivium

A lending primitive where each EOA becomes a single-lender venue, powered by ERC-7702 + Morpho Blue on Arbitrum.

> *Two paths. One loan. No pool.*

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v3** wired to design tokens in [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md)
- **wagmi v2** + **viem** + **ethers v6** (both, by design — wagmi for hooks, ethers for ad-hoc reads)
- **@nivo/sankey** for the dashboard Liquidity Flow chart
- **next-themes** for light/dark mode (defaults to dark)

## Getting started

```bash
cp .env.local.example .env.local   # fill in optional keys
npm install
npm run dev                        # http://localhost:3000
```

## Routes

- `/` — landing page (logo top-left, "Go to App" top-right).
- `/market` — browse *bivia* (single-lender venues). Placeholder cards for now.
- `/dashboard` — user positions + animated Sankey of liquidity flow.

## Docs

- [`bivium-context.md`](./bivium-context.md) — the full product thesis, the rsETH/Aave story, design decisions.
- [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) — colors, type, spacing, components, accessibility. Single source of truth — do not deviate without updating the file.

## Scripts

```bash
npm run dev        # local dev server
npm run build      # production build
npm run start      # serve production build
npm run lint       # next lint
npm run typecheck  # tsc --noEmit
```
