"use client";

import { ResponsiveSankey } from "@nivo/sankey";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * Three-column liquidity flow: collateral → intermediate token → protocol.
 * Seeded with a static dataset that mirrors the reference screenshot
 * (ETH → WETH/wstETH/weETH/osETH → BalancerV3/Curve/Fluid/Idle). Swap with
 * indexer data later — the component is purely presentational.
 */
export const demoFlow = {
  nodes: [
    { id: "ETH", category: "source" },
    { id: "iETHv2", category: "intermediate" },
    { id: "WETH", category: "intermediate" },
    { id: "wstETH", category: "intermediate" },
    { id: "weETH", category: "intermediate" },
    { id: "osETH", category: "intermediate" },
    { id: "Fluid", category: "sink" },
    { id: "BalancerV3 (A)", category: "sink" },
    { id: "Curve", category: "sink" },
    { id: "BalancerV3 (B)", category: "sink" },
    { id: "Idle", category: "sink" },
  ],
  links: [
    { source: "ETH", target: "iETHv2", value: 3800 },
    { source: "ETH", target: "WETH", value: 1840, active: true },
    { source: "ETH", target: "wstETH", value: 1670 },
    { source: "ETH", target: "weETH", value: 330 },
    { source: "ETH", target: "osETH", value: 41 },
    { source: "iETHv2", target: "Fluid", value: 3800 },
    { source: "WETH", target: "BalancerV3 (A)", value: 1840, active: true },
    { source: "wstETH", target: "BalancerV3 (A)", value: 1420 },
    { source: "wstETH", target: "Curve", value: 250 },
    { source: "weETH", target: "Curve", value: 320 },
    { source: "weETH", target: "BalancerV3 (B)", value: 10 },
    { source: "osETH", target: "BalancerV3 (B)", value: 36 },
    { source: "osETH", target: "Idle", value: 5 },
  ],
};

type CssVars = {
  bgElevated: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  flow: string;
  flowActive: string;
};

function readCssVars(): CssVars {
  if (typeof window === "undefined") {
    return {
      bgElevated: "#0a1f49",
      border: "#16315f",
      textPrimary: "#ffffff",
      textSecondary: "#c5d4f0",
      flow: "rgba(42, 70, 122, .35)",
      flowActive: "#14f2fc",
    };
  }
  const root = getComputedStyle(document.documentElement);
  return {
    bgElevated: root.getPropertyValue("--bg-elevated").trim() || "#0a1f49",
    border: root.getPropertyValue("--border").trim() || "#16315f",
    textPrimary: root.getPropertyValue("--text-primary").trim() || "#ffffff",
    textSecondary: root.getPropertyValue("--text-secondary").trim() || "#c5d4f0",
    flow: root.getPropertyValue("--chart-flow").trim() || "rgba(42, 70, 122, .35)",
    flowActive: root.getPropertyValue("--chart-flow-active").trim() || "#14f2fc",
  };
}

export function LiquidityFlowChart() {
  const { resolvedTheme } = useTheme();
  const reducedMotion = useReducedMotion();
  const [vars, setVars] = useState<CssVars>(() => readCssVars());

  // Re-read tokens when the theme changes so the chart matches the rest of the UI.
  useEffect(() => {
    setVars(readCssVars());
  }, [resolvedTheme]);

  return (
    <div
      className="rounded-lg border border-border bg-bg-elevated p-4"
      style={{ height: 520 }}
    >
      <ResponsiveSankey
        data={demoFlow}
        margin={{ top: 16, right: 140, bottom: 16, left: 16 }}
        align="justify"
        nodeOpacity={1}
        nodeHoverOthersOpacity={0.4}
        nodeThickness={14}
        nodeSpacing={18}
        nodeBorderRadius={3}
        nodeBorderWidth={0}
        nodeBorderColor={{ from: "color", modifiers: [["darker", 0.6]] }}
        linkOpacity={1}
        linkHoverOthersOpacity={0.3}
        linkContract={2}
        enableLinkGradient={false}
        labelPosition="outside"
        labelOrientation="horizontal"
        labelPadding={12}
        labelTextColor={vars.textPrimary}
        animate={!reducedMotion}
        motionConfig="gentle"
        colors={(node) => {
          // Use cyan for the highlighted "active" path, neutral border tone otherwise.
          const active = demoFlow.links.some(
            (l) => "active" in l && l.active && (l.source === node.id || l.target === node.id),
          );
          return active ? vars.flowActive : vars.border;
        }}
        linkBlendMode="normal"
        theme={{
          background: "transparent",
          text: {
            fontFamily: "var(--font-geist-sans), system-ui",
            fontSize: 12,
            fill: vars.textSecondary,
          },
          labels: {
            text: {
              fontSize: 13,
              fontWeight: 500,
              fill: vars.textPrimary,
            },
          },
          tooltip: {
            container: {
              background: vars.bgElevated,
              color: vars.textPrimary,
              border: `1px solid ${vars.border}`,
              borderRadius: 8,
              padding: "8px 12px",
              fontFamily: "var(--font-geist-sans), system-ui",
              fontSize: 12,
            },
          },
        }}
      />
    </div>
  );
}
