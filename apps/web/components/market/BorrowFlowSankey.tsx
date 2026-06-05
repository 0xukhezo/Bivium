"use client";

import { ResponsiveSankey } from "@nivo/sankey";
import { useAccount } from "wagmi";
import type { Token } from "@/lib/tokens";
import { formatCompact, formatPercent, truncateAddress } from "@/lib/utils";

// One contribution to a borrow order — the slice of `amount` (loan-token
// units) that a specific lender fills at their `ratePerSecond` (annual
// fraction). `ratePerSecondRaw` is the 1e18 fixed-point form needed for
// on-chain calls. Independent of any specific offer/orderbook type so the
// component is reusable with whichever source produced the walk.
export interface BorrowFill {
  lender: string;
  ratePerSecond: number;
  ratePerSecondRaw: bigint;
  amount: number;
}

interface BorrowFlowSankeyProps {
  fills: BorrowFill[];
  loanToken: Token;
}

// Rate badges are an HTML overlay because @nivo/sankey@0.88's `layers` prop
// only accepts built-in IDs — no custom React layers.
export function BorrowFlowSankey({ fills, loanToken }: BorrowFlowSankeyProps) {
  const { address } = useAccount();
  const youLabel = address ? truncateAddress(address) : "You";

  if (fills.length === 0) return null;

  const data = {
    nodes: [
      ...fills.map((f) => ({
        id: f.lender,
        nodeLabel: truncateAddress(f.lender),
      })),
      { id: "you" as const, nodeLabel: youLabel },
    ],
    links: fills.map((f) => ({
      source: f.lender,
      target: "you" as const,
      value: f.amount,
    })),
  };

  const ratesByLender = new Map(
    fills.map((f) => [f.lender, f.ratePerSecond]),
  );

  // Anchor badges to source-node centers; link midpoints all sit at y=50%
  // with a single target node.
  const total = fills.reduce((sum, f) => sum + f.amount, 0);
  let cumulative = 0;
  const ratePositions = fills.map((f) => {
    const start = cumulative / total;
    const end = (cumulative + f.amount) / total;
    cumulative += f.amount;
    const sourceCenter = (start + end) / 2;
    const yPx = 8 + sourceCenter * 208;
    return { rate: f.ratePerSecond, yPx };
  });

  // nivo's runtime link shape isn't exported; typing strictly here would
  // pull half of @nivo/sankey's internals.
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
        <span style={{ fontFamily: "var(--font-jetbrains), monospace" }}>
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
