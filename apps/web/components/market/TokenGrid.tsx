"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Card, CardLabel } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { TokenFilterDropdown } from "@/components/market/TokenFilterDropdown";
import { SUPPORTED_TOKENS, type Token } from "@/lib/tokens";

interface LenderPlaceholder {
  id: string;
  display: string;
  borrowToken: Token;
}

// Cycle the placeholders across the supported tokens so the filter has
// something to bite on until real lender data lands.
const PLACEHOLDERS: LenderPlaceholder[] = Array.from({ length: 9 }, (_, i) => {
  const suffix = i.toString(16).padStart(4, "0");
  return {
    id: `0x${"0".repeat(36)}${suffix}`,
    display: `0x…${suffix}`,
    borrowToken: SUPPORTED_TOKENS[i % SUPPORTED_TOKENS.length],
  };
});

export function TokenGrid() {
  const [query, setQuery] = useState("");
  const [selectedAddresses, setSelectedAddresses] = useState<Set<string>>(
    new Set(),
  );

  const toggleToken = (address: string) => {
    setSelectedAddresses((prev) => {
      const next = new Set(prev);
      const key = address.toLowerCase();
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PLACEHOLDERS.filter((lender) => {
      if (
        selectedAddresses.size > 0 &&
        !selectedAddresses.has(lender.borrowToken.address.toLowerCase())
      ) {
        return false;
      }
      if (q && !lender.id.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [query, selectedAddresses]);

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          placeholder="Search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          prefixSlot={<Search size={16} aria-hidden="true" />}
          aria-label="Search lenders"
          className="!h-12 flex-1 sm:!h-11"
        />
        <TokenFilterDropdown
          tokens={SUPPORTED_TOKENS}
          selectedAddresses={selectedAddresses}
          onToggle={toggleToken}
        />
      </div>
      {filtered.length === 0 ? (
        <div className="rounded-md border border-border bg-bg-sunken px-4 py-12 text-center">
          <p className="text-text-secondary">No venues match the current filter.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((lender) => (
            <Card key={lender.id} interactive>
              <div className="flex items-start justify-between">
                <div>
                  <CardLabel>Sovereign lender</CardLabel>
                  <p className="mt-2 font-mono text-base text-text-primary">
                    {lender.display}
                  </p>
                </div>
                <Badge variant="accent" className="gap-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={lender.borrowToken.iconUrl}
                    alt=""
                    aria-hidden="true"
                    width={14}
                    height={14}
                    className="h-3.5 w-3.5 rounded-full object-contain"
                  />
                  {lender.borrowToken.symbol}
                </Badge>
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
      )}
    </>
  );
}
