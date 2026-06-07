"use client";

import { useMemo } from "react";
import type { DepthStep } from "@/lib/api/market-depth";
import {
  baseUnitsToNumber,
  formatCompact,
  formatPercent,
} from "@/lib/utils";

interface DepthChartProps {
  steps: DepthStep[];
  loanSymbol: string;
  loanDecimals: number;
  /**
   * Optional size-weighted average APY across the whole book. When set,
   * the chart draws a dotted horizontal reference line at this rate.
   * Pass `null` to suppress.
   */
  avgRate?: number | null;
}

// Step plot — X is the cumulative borrow size in loan-token units, Y is the
// APY a borrower would draw at, walked top-down through the order book.
// Each step extends from the previous lender's cumulative to this lender's
// cumulative at this lender's rate. Lenders at the same rate naturally
// merge into one wider step because their Y matches.
//
// Layout notes:
//   - Title + helper text live in the parent Card's header, so the SVG
//     doesn't repeat axis names inside the plot.
//   - viewBox is fixed at 960×360; `preserveAspectRatio="none"` lets it
//     fill the container width (parent gives it a height via Tailwind h-80).
//   - Y ticks are snapped to a "nice" step (1 / 0.5 / 0.25 / 0.1 / ...).
//   - X ticks use formatCompact so small values stay readable and big
//     values flip to K/M/B.

const VIEWBOX_W = 960;
const VIEWBOX_H = 360;
const PAD = { top: 32, right: 32, bottom: 56, left: 72 };

export function DepthChart({
  steps,
  loanSymbol,
  loanDecimals,
  avgRate = null,
}: DepthChartProps) {
  const chart = {
    x: PAD.left,
    y: PAD.top,
    w: VIEWBOX_W - PAD.left - PAD.right,
    h: VIEWBOX_H - PAD.top - PAD.bottom,
  };

  const layout = useMemo(() => {
    if (steps.length === 0) {
      return null;
    }
    // Convert bigint base units → float for plotting. Lossy past ~15
    // significant digits; only matters for tokens with extreme decimal
    // counts at huge totals, which the chart already compacts on display.
    const cum = steps.map((s) =>
      baseUnitsToNumber(s.cumulativeAmount, loanDecimals),
    );
    const xMax = cum[cum.length - 1];
    const rates = steps.map((s) => s.apy);
    const minRate = Math.min(...rates);
    const maxRate = Math.max(...rates);

    const { min: yMin, max: yMax, ticks: yTicksValues } = niceScale(
      minRate,
      maxRate,
      5,
    );
    // X scale is `[0, xScaleMax]`, with `xScaleMax >= xMax` snapped to the
    // next nice step. This keeps every tick (and its label) inside the
    // chart area — without it, the rightmost tick can render past the
    // SVG's right edge, clipping the token symbol.
    const { max: xScaleMax, ticks: xTicksValues } = niceXTicks(xMax, 4);

    return {
      cum,
      xMax,
      xScaleMax,
      yMin,
      yMax,
      yTicksValues,
      xTicksValues,
    };
  }, [steps, loanDecimals]);

  if (!layout) {
    return (
      <div className="flex h-80 items-center justify-center rounded-md border border-border bg-bg-sunken text-sm text-text-secondary">
        No depth to plot yet.
      </div>
    );
  }

  const { cum, xMax, xScaleMax, yMin, yMax, yTicksValues, xTicksValues } =
    layout;

  const sx = (v: number) =>
    chart.x + (v / Math.max(xScaleMax, 1e-12)) * chart.w;
  const sy = (v: number) =>
    chart.y + chart.h - ((v - yMin) / Math.max(yMax - yMin, 1e-12)) * chart.h;

  // Build the step path: start at (0, first.apy), then for each step walk
  // horizontally to that step's cumulative, then vertically to the next
  // step's rate.
  let pathD = `M ${sx(0).toFixed(2)} ${sy(steps[0].apy).toFixed(2)}`;
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    pathD += ` L ${sx(cum[i]).toFixed(2)} ${sy(s.apy).toFixed(2)}`;
    const next = steps[i + 1];
    if (next) {
      pathD += ` L ${sx(cum[i]).toFixed(2)} ${sy(next.apy).toFixed(2)}`;
    }
  }

  return (
    <div className="overflow-hidden rounded-md border border-border bg-bg-sunken">
      <svg
        viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
        preserveAspectRatio="none"
        className="h-80 w-full"
        role="img"
        aria-label={`Borrow depth chart for ${loanSymbol}`}
      >
        <defs>
          <linearGradient id="depth-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Y gridlines + tick labels — staggered fade-in */}
        {yTicksValues.map((v, i) => (
          <g
            key={`y-${v}`}
            className="depth-gridline"
            style={{ animationDelay: `${40 + i * 30}ms` }}
          >
            <line
              x1={chart.x}
              x2={chart.x + chart.w}
              y1={sy(v)}
              y2={sy(v)}
              stroke="var(--border)"
              strokeDasharray="2 5"
              strokeWidth={0.5}
            />
            <text
              x={chart.x - 12}
              y={sy(v)}
              textAnchor="end"
              dominantBaseline="middle"
              fill="var(--text-muted)"
              fontSize={12}
              fontFamily="var(--font-mono, monospace)"
            >
              {formatPercent(v, 2)}
            </text>
          </g>
        ))}

        {/* X tick labels — same staggered entrance, anchored so the edge
            labels don't overflow */}
        {xTicksValues.map((v, i, arr) => (
          <text
            key={`x-${v}`}
            x={sx(v)}
            y={chart.y + chart.h + 22}
            textAnchor={
              i === 0 ? "start" : i === arr.length - 1 ? "end" : "middle"
            }
            fill="var(--text-muted)"
            fontSize={12}
            fontFamily="var(--font-mono, monospace)"
            className="depth-gridline"
            style={{ animationDelay: `${120 + i * 30}ms` }}
          >
            {formatCompact(v)} {loanSymbol}
          </text>
        ))}

        {/* X axis baseline */}
        <line
          x1={chart.x}
          x2={chart.x + chart.w}
          y1={chart.y + chart.h}
          y2={chart.y + chart.h}
          stroke="var(--border)"
          strokeWidth={1}
        />

        {/* Filled area under the step line — rises from baseline. */}
        <path
          d={`${pathD} L ${sx(xMax).toFixed(2)} ${(chart.y + chart.h).toFixed(2)} L ${sx(0).toFixed(2)} ${(chart.y + chart.h).toFixed(2)} Z`}
          fill="url(#depth-fill)"
          className="depth-area"
        />

        {/* Step line — draws left-to-right via stroke-dashoffset. */}
        <path
          d={pathD}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="miter"
          pathLength={1}
          className="depth-line"
        />

        {/* Per-step APY label centered on the horizontal segment, with a
            dot at the right edge of the segment. Each step's dot and
            label are delayed so they appear just after the line has
            passed them. */}
        {steps.map((s, i) => {
          const prevX = i === 0 ? 0 : cum[i - 1];
          const curX = cum[i];
          const midX = (prevX + curX) / 2;
          const dotX = sx(curX);
          const dotY = sy(s.apy);
          const labelY = dotY - 12;
          // Line draws over ~900ms starting at 80ms; spread step entrances
          // across that window so each dot pops in once the line has
          // reached it.
          const progress = xMax > 0 ? curX / xMax : 0;
          const dotDelay = 80 + Math.round(progress * 900);
          return (
            <g key={`pt-${s.lender}-${i}`}>
              <circle
                cx={dotX}
                cy={dotY}
                r={3.5}
                fill="var(--accent)"
                className="depth-dot"
                style={{ animationDelay: `${dotDelay}ms` }}
              />
              <text
                x={sx(midX)}
                y={labelY}
                textAnchor="middle"
                fill="var(--text-secondary)"
                fontSize={12}
                fontFamily="var(--font-mono, monospace)"
                className="depth-label"
                style={{ animationDelay: `${dotDelay + 60}ms` }}
              >
                {formatPercent(s.apy, 2)}
              </text>
            </g>
          );
        })}

        {/* Y axis baseline */}
        <line
          x1={chart.x}
          x2={chart.x}
          y1={chart.y}
          y2={chart.y + chart.h}
          stroke="var(--border)"
          strokeWidth={1}
        />

        {/* Size-weighted average rate reference. Dotted horizontal line +
            inline "avg X.XX%" badge anchored at the right edge. Only drawn
            when the avg falls inside the visible Y range. */}
        {avgRate !== null && avgRate >= yMin && avgRate <= yMax ? (
          <g
            className="depth-label"
            style={{ animationDelay: `${80 + 900 + 120}ms` }}
          >
            <line
              x1={chart.x}
              x2={chart.x + chart.w}
              y1={sy(avgRate)}
              y2={sy(avgRate)}
              stroke="var(--text-secondary)"
              strokeWidth={1}
              strokeDasharray="3 3"
              strokeOpacity={0.7}
            />
            <rect
              x={chart.x + chart.w - 88}
              y={sy(avgRate) - 10}
              width={84}
              height={18}
              rx={9}
              fill="var(--bg-elevated)"
              stroke="var(--text-secondary)"
              strokeOpacity={0.5}
              strokeWidth={0.75}
            />
            <text
              x={chart.x + chart.w - 46}
              y={sy(avgRate)}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="var(--text-secondary)"
              fontSize={11}
              fontFamily="var(--font-mono, monospace)"
            >
              avg {formatPercent(avgRate, 2)}
            </text>
          </g>
        ) : null}
      </svg>
    </div>
  );
  // (loanDecimals is currently unused — keep it on the prop for future
  // base-unit-aware tick formatting once amounts are bigints.)
  void loanDecimals;
}

// ── Tick helpers ─────────────────────────────────────────────────────────

// Pick a "nice" tick interval covering the data range with ~`target` ticks,
// then snap min/max outward to that interval. Returns the snapped range
// plus the ticks themselves.
function niceScale(
  min: number,
  max: number,
  target: number,
): { min: number; max: number; ticks: number[] } {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
    // Degenerate — synthesize a half-percent band so the line isn't
    // collapsed onto the X axis.
    const m = Number.isFinite(min) ? min : 0;
    return { min: m - 0.005, max: m + 0.005, ticks: [m - 0.005, m, m + 0.005] };
  }
  const span = max - min;
  const rawStep = span / Math.max(target - 1, 1);
  const step = niceStep(rawStep);
  const niceMin = Math.floor(min / step) * step;
  const niceMax = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = niceMin; v <= niceMax + step * 1e-6; v += step) {
    ticks.push(roundTo(v, step));
  }
  return { min: niceMin, max: niceMax, ticks };
}

// Compute the snapped X-scale upper bound + the tick values between 0 and
// it. The caller uses `max` as the scale's upper bound (not the raw data
// xMax) so every returned tick lands inside the plot area.
function niceXTicks(
  xMax: number,
  target: number,
): { max: number; ticks: number[] } {
  if (!Number.isFinite(xMax) || xMax <= 0) {
    return { max: 1, ticks: [0] };
  }
  const rawStep = xMax / Math.max(target, 1);
  const step = niceStep(rawStep);
  const niceMax = Math.ceil(xMax / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= niceMax + step * 1e-6; v += step) {
    ticks.push(roundTo(v, step));
  }
  return { max: niceMax, ticks };
}

// Round `n` to the nearest multiple of `step` and clean trailing FP noise.
function roundTo(n: number, step: number): number {
  const decimals = Math.max(0, -Math.floor(Math.log10(step)));
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

// Snap a raw "candidate step" to {1, 2, 2.5, 5} × 10^k. The classic
// d3-style nice-step heuristic.
function niceStep(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return 1;
  const pow10 = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / pow10;
  let nice: number;
  if (norm < 1.5) nice = 1;
  else if (norm < 3) nice = 2;
  else if (norm < 4) nice = 2.5;
  else if (norm < 7) nice = 5;
  else nice = 10;
  return nice * pow10;
}
