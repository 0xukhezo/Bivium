import { TokenGrid } from "@/components/market/TokenGrid";

export const metadata = {
  title: "Market · Bivium",
};

export default function MarketPage() {
  return (
    <>
      <header className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-text-primary">Market</h1>
          <h2 className="mt-2 max-w-xl text-text-secondary">
            Browse the open borrows and pick the ones to match against your
            collateral.
          </h2>
        </div>
      </header>
      <TokenGrid />
    </>
  );
}
