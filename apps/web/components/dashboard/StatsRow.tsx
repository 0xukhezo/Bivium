import { Card, CardLabel } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

interface Stat {
  label: string;
  value: string;
  helper?: string;
  tone?: "neutral" | "positive" | "warn";
}

const stats: Stat[] = [
  { label: "Supplied", value: "12,480.00", helper: "USDC" },
  { label: "Borrowed", value: "4,210.00", helper: "USDC" },
  { label: "Net APR", value: "+3.80%", tone: "positive" },
  { label: "Health factor", value: "1.92", tone: "positive" },
];

export function StatsRow() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((s) => (
        <Card key={s.label} dense>
          <CardLabel>{s.label}</CardLabel>
          <div className="mt-3 flex items-baseline gap-2">
            <p className="font-mono text-2xl font-semibold text-text-primary tabular-nums">
              {s.value}
            </p>
            {s.helper ? (
              <span className="text-sm text-text-muted">{s.helper}</span>
            ) : null}
          </div>
          <div className="mt-3">
            <Badge variant={s.tone === "positive" ? "success" : "neutral"}>Demo</Badge>
          </div>
        </Card>
      ))}
    </div>
  );
}
