"use client";

import { ResponsiveSankey } from "@nivo/sankey";
import { useAccount } from "wagmi";
import type { Fill } from "@/lib/lender-offers";
import type { Token } from "@/lib/tokens";
import { formatCompact, formatPercent, truncateAddress } from "@/lib/utils";

interface BorrowFlowSankeyProps {
  fills: Fill[];
  loanToken: Token;
}

/**
 * Reversed two-tier Sankey: lender nodes on the LEFT pouring into the
 * connected wallet (or "You") on the RIGHT. Per-flow rate badges are rendered
 * as an HTML overlay on top of the Sankey because @nivo/sankey@0.88's `layers`
 * prop only accepts the four built-in IDs — no custom React layers.
 */
export function BorrowFlowSankey({ fills, loanToken }: BorrowFlowSankeyProps) {
  const { address } = useAccount();
  const youLabel = address ? truncateAddress(address) : "You";

  if (fills.length === 0) return null;

  const data = {
    nodes: [
      ...fills.map((f) => ({
        id: f.offer.lender,
        nodeLabel: truncateAddress(f.offer.lender),
      })),
      { id: "you" as const, nodeLabel: youLabel },
    ],
    links: fills.map((f) => ({
      source: f.offer.lender,
      target: "you" as const,
      value: f.amount,
    })),
  };

  // Source-id → rate for the link tooltip.
  const ratesByLender = new Map(
    fills.map((f) => [f.offer.lender, f.offer.ratePerSecond]),
  );

  // Per-fill vertical position = the SOURCE node's slice center. With one
  // target node, every link curves to the same y=50%, so the link midpoints
  // bunch near 50% — using sourceCenter spreads the badges across the full
  // chart so each one sits over its own line.
  // Container is h-56 (224px); Sankey margins are top:8, bottom:8.
  const total = fills.reduce((sum, f) => sum + f.amount, 0);
  let cumulative = 0;
  const ratePositions = fills.map((f) => {
    const start = cumulative / total;
    const end = (cumulative + f.amount) / total;
    cumulative += f.amount;
    const sourceCenter = (start + end) / 2; // 0..1 within inner area
    const yPx = 8 + sourceCenter * 208;
    return { rate: f.offer.ratePerSecond, yPx };
  });

  // `link` shape comes from nivo at runtime; typing it strictly here would
  // pull half of @nivo/sankey's internals — `any` is the pragmatic choice.
  const LinkTooltip = ({ link }: { link: any }) => {
    const sourceId =
      typeof link.source === "string" ? link.source : link.source?.id;
    const rate = ratesByLender.get(sourceId) ?? 0;
    return (
      <div
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          color: "var(--text-primary)",
          padding: "8px 12px",
          borderRadius: 8,
          fontSize: 12,
          lineHeight: 1.4,
          maxWidth: 240,
          whiteSpace: "normal",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <span style={{ fontFamily: "var(--font-geist-mono), monospace" }}>
          {truncateAddress(sourceId)}
        </span>
        {" lending "}
        <span style={{ fontWeight: 600 }}>
          {formatCompact(link.value)} {loanToken.symbol}
        </span>
        {" at "}
        <span style={{ color: "var(--accent)", fontWeight: 600 }}>
          {formatPercent(rate)}
        </span>
      </div>
    );
  };

  return (
    <div className="relative h-56 w-full">
      <ResponsiveSankey
        data={data}
        margin={{ top: 8, right: 80, bottom: 8, left: 140 }}
        align="justify"
        colors={["#0176f8"]}
        nodeOpacity={1}
        nodeThickness={14}
        nodeInnerPadding={3}
        nodeSpacing={14}
        nodeBorderWidth={0}
        nodeBorderRadius={3}
        linkOpacity={0.65}
        linkHoverOpacity={0.9}
        linkContract={0}
        enableLinkGradient
        labelPosition="outside"
        labelOrientation="horizontal"
        labelPadding={10}
        labelTextColor="var(--text-primary)"
        label={(node) =>
          (node as { nodeLabel?: string }).nodeLabel ?? String(node.id)
        }
        animate
        motionConfig="gentle"
        valueFormat={(v) => `${formatCompact(v as number)} ${loanToken.symbol}`}
        linkTooltip={LinkTooltip}
        theme={{
          background: "transparent",
          text: { fill: "var(--text-primary)", fontSize: 12 },
          labels: { text: { fill: "var(--text-primary)" } },
          tooltip: {
            container: {
              background: "var(--bg-elevated)",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
              padding: "6px 10px",
              maxWidth: 240,
              whiteSpace: "normal",
            },
          },
        }}
      />
      {/* Rate badges floated over each link near its SOURCE side, where the
          curves are still vertically separated. left = 220px sits ~30px into
          the link (source node ends at 140+14 = 154). */}
      <div className="pointer-events-none absolute inset-0">
        {ratePositions.map((p, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              left: "220px",
              top: `${p.yPx}px`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <span className="inline-flex items-center rounded-pill border border-accent/40 bg-bg-elevated/95 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-accent shadow-card backdrop-blur-sm">
              {formatPercent(p.rate)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
