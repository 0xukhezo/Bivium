import { TokenGrid } from "@/components/market/TokenGrid";

export const metadata = {
  title: "Market · Bivium",
};

export default function MarketPage() {
  return (
    <>
      <header className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-widest text-text-muted">Browse</p>
          <h1 className="mt-1 text-3xl font-semibold text-text-primary">
            <em>bivia</em>
          </h1>
          <p className="mt-2 max-w-xl text-text-secondary">
            Single-lender venues currently accepting borrows. Each card is one sovereign
            lender with their own terms.
          </p>
        </div>
      </header>
      <TokenGrid />
    </>
  );
}
