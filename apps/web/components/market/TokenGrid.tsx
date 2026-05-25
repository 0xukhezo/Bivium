import { Card, CardLabel } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

/**
 * Placeholder grid. Card content here is intentionally schematic — real lender
 * cards (collateral, LTV, rate, lender identity) land once contracts are wired.
 */
const placeholders = Array.from({ length: 9 }, (_, i) => i);

export function TokenGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {placeholders.map((i) => (
        <Card key={i} interactive>
          <div className="flex items-start justify-between">
            <div>
              <CardLabel>Sovereign lender</CardLabel>
              <p className="mt-2 font-mono text-base text-text-primary">
                0x…{i.toString(16).padStart(4, "0")}
              </p>
            </div>
            <Badge variant="accent">Coming soon</Badge>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-text-muted">Collateral</p>
              <p className="mt-1 font-medium text-text-primary">—</p>
            </div>
            <div>
              <p className="text-text-muted">LTV</p>
              <p className="mt-1 font-medium text-text-primary tabular-nums">
                —
              </p>
            </div>
            <div>
              <p className="text-text-muted">APR</p>
              <p className="mt-1 font-medium text-text-primary tabular-nums">
                —
              </p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
