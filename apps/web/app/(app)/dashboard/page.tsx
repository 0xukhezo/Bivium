import { StatsRow } from "@/components/dashboard/StatsRow";
import { LiquidityFlowChart } from "@/components/dashboard/LiquidityFlowChart";

export const metadata = {
  title: "Dashboard · Bivium",
};

export default function DashboardPage() {
  return (
    <div className="space-y-10">
      <header>
        <p className="text-sm uppercase tracking-widest text-text-muted">Your positions</p>
        <h1 className="mt-1 text-3xl font-semibold text-text-primary">Dashboard</h1>
        <p className="mt-2 max-w-2xl text-text-secondary">
          Supplies, borrows, and the liquidity flowing through your <em>bivium</em>.
        </p>
      </header>

      <StatsRow />

      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold text-text-primary">Liquidity flow</h2>
          <p className="text-sm text-text-muted">
            Highlighted path: <span className="text-accent">WETH → BalancerV3</span>
          </p>
        </div>
        <LiquidityFlowChart />
      </section>
    </div>
  );
}
