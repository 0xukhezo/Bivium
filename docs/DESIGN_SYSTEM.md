# Bivium — Design System

> Single source of truth for Bivium's visual language. Everything in `app/` and `components/` reads from these tokens. If something in the UI cannot be expressed in terms of the tokens below, the system is incomplete — extend the system before deviating from it.

---

## 1. Brand foundation

**Name:** Bivium — from Latin *bivium*, "a place where two paths meet."
**Tagline ladder:**
- Short: *Be your own Aave.*
- Alternate: *Two paths. One loan. No pool.*
- Long: *Turn your EOA into a personal lending protocol. Your wallet is the venue. Your identity is the brand. Your terms are the law.*

**Voice in copy:** precise, structural, slightly classical. We invoke an old idea (two parties at a crossroads agreeing on a loan) and execute it with new tooling (ERC-7702 + Morpho). Avoid hype-DeFi tone — no rockets, no flames, no exclamation marks. Latin word marks (*bivium*, *bivia*) are part of the brand and should be styled with `font-style: italic` in running prose.

---

## 2. Color tokens

### 2.1 Brand seeds

These five colors are non-negotiable — they are the Arbitrum brand and the product depends on visual continuity with it.

| Token | Hex | Role |
|---|---|---|
| `--color-arb-blue` | `#0176f8` | Primary brand. CTA fill. Active link. Chart primary. |
| `--color-arb-deep` | `#013a87` | Secondary surface. Link hover. Dark-mode chrome. |
| `--color-arb-midnight` | `#05163e` | Dark-mode canvas. Deepest surface. |
| `--color-arb-cyan` | `#14f2fc` | Highlight only — focus ring, glow, active chart flow. |
| `--color-arb-white` | `#ffffff` | Light-mode canvas. Dark-mode foreground text. |

### 2.2 Neutral ink scale (derived)

Tinted slightly toward `--color-arb-deep` so neutrals don't read as dead next to the brand blue.

| Token | Hex | Use |
|---|---|---|
| `--color-ink-950` | `#020b22` | Deepest dark surface (sunken) |
| `--color-ink-900` | `#0a1f49` | Dark elevated surface |
| `--color-ink-800` | `#16315f` | Dark border, dark hover |
| `--color-ink-700` | `#2a467a` | Dark muted text, chart line base |
| `--color-ink-500` | `#6b81a8` | Mid-tone text on either theme |
| `--color-ink-400` | `#94a6c8` | Subtle text on dark |
| `--color-ink-300` | `#c5d4f0` | Secondary text on dark |
| `--color-ink-200` | `#e1e9f7` | Light border |
| `--color-ink-100` | `#f0f4fb` | Light elevated surface |
| `--color-ink-50`  | `#f7f9fc` | Light sunken surface |

### 2.3 Semantic accents

Chosen for AA contrast against both canvases (`#ffffff` and `#05163e`).

| Token | Hex | Use |
|---|---|---|
| `--color-success` | `#34d399` | Positive APR, healthy factor |
| `--color-warn`    | `#fbbf24` | Caution (e.g. health factor 1.2-1.5) |
| `--color-danger`  | `#f87171` | Negative, near-liquidation |

---

## 3. Light vs dark mapping

Dark is the default. Light is opt-in via the theme toggle. Both swap `[data-theme]` on `<html>`.

| Semantic role | Dark (`[data-theme="dark"]`, default) | Light (`[data-theme="light"]`) |
|---|---|---|
| `--bg` | `--color-arb-midnight` `#05163e` | `--color-arb-white` `#ffffff` |
| `--bg-elevated` | `--color-ink-900` `#0a1f49` | `--color-ink-100` `#f0f4fb` |
| `--bg-sunken` | `--color-ink-950` `#020b22` | `--color-ink-50` `#f7f9fc` |
| `--border` | `--color-ink-800` `#16315f` | `--color-ink-200` `#e1e9f7` |
| `--text-primary` | `--color-arb-white` `#ffffff` | `--color-arb-midnight` `#05163e` |
| `--text-secondary` | `--color-ink-300` `#c5d4f0` | `--color-ink-700` `#2a467a` |
| `--text-muted` | `--color-ink-400` `#94a6c8` | `--color-ink-500` `#6b81a8` |
| `--accent` | `--color-arb-blue` `#0176f8` | `--color-arb-blue` `#0176f8` |
| `--accent-hover` | `#1a8aff` (blue +1 step) | `--color-arb-deep` `#013a87` |
| `--focus-ring` | `--color-arb-cyan` `#14f2fc` | `--color-arb-cyan` `#14f2fc` |
| `--chart-flow` | `--color-ink-700` at 35% | `--color-ink-300` at 60% |
| `--chart-flow-active` | `--color-arb-cyan` `#14f2fc` | `--color-arb-blue` `#0176f8` |

**Rule:** `--accent` is the same in both themes. The product is unambiguously *Arbitrum blue* regardless of mode.

---

## 4. Typography

- **Display / UI:** Geist Sans (variable). Headings and body.
- **Mono:** Geist Mono. Addresses, hashes, numeric token amounts, code.

Type scale (px / line-height):

| Step | Size | Line-height | Use |
|---|---|---|---|
| `xs`   | 12 | 16 | Captions, table footers |
| `sm`   | 14 | 20 | Secondary text, badges |
| `base` | 16 | 24 | Body |
| `lg`   | 18 | 28 | Lead paragraph |
| `xl`   | 20 | 28 | Section subhead |
| `2xl`  | 24 | 32 | Card title |
| `3xl`  | 30 | 36 | Page title |
| `4xl`  | 36 | 40 | Hero subhead |
| `5xl`  | 48 | 52 | Hero |
| `6xl`  | 64 | 68 | Marketing hero (landing only) |

**Numerics:** any element rendering a balance, APR, LTV, or token amount must set `font-variant-numeric: tabular-nums`. This includes badge text. Non-negotiable — alignment is part of the product.

**Weights:** 400 body, 500 emphasis, 600 headings, 700 hero only.

---

## 5. Spacing & layout

Base unit **4 px**. Scale (in `px`): `0, 4, 8, 12, 16, 24, 32, 48, 64, 96, 128`.

Containers:
- Landing: `max-w-7xl` (1280 px) with `px-6 lg:px-12`.
- App shell: `max-w-screen-2xl` (1536 px) with `px-6 lg:px-10`.
- Header inner height: 64 px (landing), 72 px (app shell).

Radii:

| Token | Px | Use |
|---|---|---|
| `--radius-sm` | 6 | Badge, small input |
| `--radius-md` | 10 | Button |
| `--radius-lg` | 14 | Card (default) |
| `--radius-xl` | 20 | Modal, hero panel |
| `--radius-pill` | 9999 | Address pill, navlink active state |

---

## 6. Elevation & glow

Two layers — ambient + contact — keep cards from feeling pasted on:

```
--shadow-card:
  0 1px 0 0 rgba(255, 255, 255, .04) inset,
  0 12px 32px -16px rgba(2, 11, 34, .55);
```

The cyan glow is a *meaning token*, not a decoration token. Use it only for:
- Active primary CTA (hover/focus)
- Focus ring (always)
- The single highlighted flow in the Liquidity Flow chart

```
--shadow-glow-cyan: 0 0 24px rgba(20, 242, 252, .25);
```

If you find yourself reaching for the glow in three places on one screen, you've broken the system. Pick one.

---

## 7. Component patterns

Patterns are described here; implementations live in `components/ui/`. Variants and sizes must come from this list — additions require updating this file.

### 7.1 Button

| Variant | Background | Foreground | Border | Hover |
|---|---|---|---|---|
| `primary` | `--accent` | `--color-arb-white` | none | `--accent-hover` + `--shadow-glow-cyan` |
| `secondary` | transparent | `--text-primary` | `--border` | `--bg-elevated` |
| `ghost` | transparent | `--text-secondary` | none | `--text-primary` |
| `danger` | `--color-danger` | `--color-arb-white` | none | darken 8% |

Sizes (height / padding-x / font-size):
- `sm` 32 / 12 / `sm`
- `md` 40 / 16 / `base` — default
- `lg` 48 / 20 / `lg`

The landing "Go to App" CTA is `primary md`.

### 7.2 Card

- Surface: `--bg-elevated`.
- Border: 1 px solid `--border`.
- Radius: `--radius-lg`.
- Padding: 24 px default, 16 px in dense grids.
- Hover (only for interactive cards): translate-y -1 px + `--shadow-card` deepened.

### 7.3 Badge / Tag

- Pill (radius `--radius-pill`), `sm` text, padding `4 px 10 px`.
- Color variants: `neutral` (subtle), `accent` (brand blue), `success`, `warn`, `danger`.
- Inline icon allowed at 12 px to the left.

### 7.4 Input

- Height 44 px, radius `--radius-md`, border 1 px `--border`.
- Focus: border becomes `--accent`, ring 2 px `--focus-ring` at 2 px offset.
- Numeric variant: tabular-nums, right-aligned content. Prefix slot for token icon (24 px), suffix slot for `MAX` button.

### 7.5 Navlink

- Inline horizontal nav item. Padding `8 px 12 px`, radius `--radius-pill`.
- Inactive: `--text-secondary`. Hover: `--text-primary`.
- Active (route matches): background `--bg-elevated`, text `--accent`.

### 7.6 Modal

- Backdrop `rgba(2, 11, 34, .6)` with `backdrop-filter: blur(8 px)`.
- Surface `--bg-elevated`, radius `--radius-xl`, max-width 440 px.
- Close icon top-right, 16 px from edges.

### 7.7 Theme toggle

- Icon button (sun / moon). 40 × 40 px, radius `--radius-pill`.
- Lives in the app header, immediately left of the connect button.

---

## 8. Motion

Durations: `fast 120 ms / base 200 ms / slow 360 ms`.
Easing: `cubic-bezier(.22, 1, .36, 1)` (out-expo-ish) for entrances; `linear` for indeterminate loaders.

Specific:
- **Theme switch:** no transition on color tokens (instant). Transitioning all colors at once looks cheap.
- **Hover lift on cards:** 200 ms `transform`.
- **Sankey link reveal:** Nivo's default with 600 ms stagger on mount.
- **Address pill copy feedback:** 1.2 s fade.

**Reduced motion:** respect `prefers-reduced-motion: reduce`. Disable Sankey animation, hover lifts, and all non-essential transitions. Keep focus rings and color changes (those are state, not decoration).

---

## 9. Accessibility

- All body text/background pairs must clear WCAG AA (4.5:1).
- **Watch-out:** `--color-arb-blue` on `--color-arb-white` is 3.3:1 — fails AA for small body text. Use it only for:
  - Buttons (filled blue, white text — passes when paired the other way)
  - Headings ≥ 18 px or ≥ 14 px bold
  - For small body text on the light theme, use `--color-arb-deep` (`#013a87`) or `--color-ink-700` instead.
- Focus ring: 2 px `--focus-ring` (`#14f2fc`) at 2 px offset. Always visible, never `:focus { outline: none }` without an equally-visible replacement.
- Never rely on color alone for state — pair with icon, label, or position.
- All interactive elements have a labelled accessible name. Wallet addresses get an `aria-label` with the full address even when truncated visually.

---

## 10. Token export (CSS)

This block is canonical. Copy verbatim into `app/globals.css` — do not edit color values anywhere else.

```css
:root {
  /* Brand seeds */
  --color-arb-blue:     #0176f8;
  --color-arb-deep:     #013a87;
  --color-arb-midnight: #05163e;
  --color-arb-cyan:     #14f2fc;
  --color-arb-white:    #ffffff;

  /* Ink scale */
  --color-ink-950: #020b22;
  --color-ink-900: #0a1f49;
  --color-ink-800: #16315f;
  --color-ink-700: #2a467a;
  --color-ink-500: #6b81a8;
  --color-ink-400: #94a6c8;
  --color-ink-300: #c5d4f0;
  --color-ink-200: #e1e9f7;
  --color-ink-100: #f0f4fb;
  --color-ink-50:  #f7f9fc;

  /* Semantic accents */
  --color-success: #34d399;
  --color-warn:    #fbbf24;
  --color-danger:  #f87171;

  /* Radii */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 20px;
  --radius-pill: 9999px;

  /* Elevation */
  --shadow-card:
    inset 0 1px 0 0 rgba(255, 255, 255, .04),
    0 12px 32px -16px rgba(2, 11, 34, .55);
  --shadow-glow-cyan: 0 0 24px rgba(20, 242, 252, .25);
}

/* Dark theme (default) */
:root,
[data-theme="dark"] {
  --bg:               var(--color-arb-midnight);
  --bg-elevated:      var(--color-ink-900);
  --bg-sunken:        var(--color-ink-950);
  --border:           var(--color-ink-800);
  --text-primary:     var(--color-arb-white);
  --text-secondary:   var(--color-ink-300);
  --text-muted:       var(--color-ink-400);
  --accent:           var(--color-arb-blue);
  --accent-hover:     #1a8aff;
  --focus-ring:       var(--color-arb-cyan);
  --chart-flow:       rgba(42, 70, 122, .35);   /* --color-ink-700 at 35% */
  --chart-flow-active: var(--color-arb-cyan);
}

/* Light theme */
[data-theme="light"] {
  --bg:               var(--color-arb-white);
  --bg-elevated:      var(--color-ink-100);
  --bg-sunken:        var(--color-ink-50);
  --border:           var(--color-ink-200);
  --text-primary:     var(--color-arb-midnight);
  --text-secondary:   var(--color-ink-700);
  --text-muted:       var(--color-ink-500);
  --accent:           var(--color-arb-blue);
  --accent-hover:     var(--color-arb-deep);
  --focus-ring:       var(--color-arb-cyan);
  --chart-flow:       rgba(197, 212, 240, .6);  /* --color-ink-300 at 60% */
  --chart-flow-active: var(--color-arb-blue);
}
```

---

*Design System v1.0 — May 2026. Owner: frontend. Updates require a PR against this file before they appear in code.*
