import { Card, CardLabel, CardTitle } from "@/components/ui/Card";

const features = [
  {
    label: "Sovereign lender",
    title: "Your EOA, your terms",
    body: "Each lender signs which collaterals, LTVs, oracles, and rates they accept. No DAO can move your line.",
  },
  {
    label: "No pool",
    title: "Risk you actually signed",
    body: "Pool-per-lender means losses stay with the lender who underwrote the exposure — not bystanders.",
  },
  {
    label: "ERC-7702",
    title: "Same wallet, new powers",
    body: "Your personal address becomes programmable while keeping its history, ENS, and reputation intact.",
  },
];

export function FeatureGrid() {
  return (
    <section id="how" className="mx-auto max-w-7xl px-6 pb-32 lg:px-12">
      <div className="grid gap-4 md:grid-cols-3">
        {features.map((f) => (
          <Card key={f.label}>
            <CardLabel>{f.label}</CardLabel>
            <CardTitle className="mt-3">{f.title}</CardTitle>
            <p className="mt-3 text-sm leading-relaxed text-text-secondary">{f.body}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}
