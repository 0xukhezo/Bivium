"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Token } from "@/lib/tokens";

interface TokenFilterDropdownProps {
  tokens: Token[];
  selectedAddresses: Set<string>;
  onToggle: (address: string) => void;
}

export function TokenFilterDropdown({
  tokens,
  selectedAddresses,
  onToggle,
}: TokenFilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selectedTokens = tokens.filter((t) =>
    selectedAddresses.has(t.address.toLowerCase()),
  );

  const triggerLabel =
    selectedTokens.length === 0
      ? "All tokens"
      : selectedTokens.length === 1
        ? selectedTokens[0].symbol
        : `${selectedTokens.length} selected`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-12 items-center gap-2 rounded-md border border-border bg-bg px-3 text-sm sm:h-11",
          "hover:border-accent transition-colors duration-base ease-out-expo",
          open && "border-accent",
        )}
      >
        {selectedTokens.length > 0 ? (
          <div className="flex -space-x-2">
            {selectedTokens.map((t) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={t.address}
                src={t.iconUrl}
                alt=""
                aria-hidden="true"
                width={20}
                height={20}
                className="h-5 w-5 rounded-full border border-bg-elevated bg-bg-elevated object-contain"
              />
            ))}
          </div>
        ) : null}
        <span className="font-medium text-text-primary">{triggerLabel}</span>
        <ChevronDown
          size={16}
          className={cn(
            "text-text-muted transition-transform duration-base ease-out-expo",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>
      {open ? (
        <div
          role="listbox"
          aria-multiselectable="true"
          className="absolute left-0 z-20 mt-2 w-64 overflow-hidden rounded-md border border-border bg-bg-elevated p-1 shadow-card"
        >
          {tokens.map((token) => {
            const active = selectedAddresses.has(
              token.address.toLowerCase(),
            );
            return (
              <button
                key={token.address}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => onToggle(token.address)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-sm px-2 py-2 text-left",
                  "hover:bg-bg-sunken transition-colors duration-base ease-out-expo",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={token.iconUrl}
                  alt=""
                  aria-hidden="true"
                  width={28}
                  height={28}
                  className="h-7 w-7 shrink-0 rounded-full object-contain"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-primary">
                    {token.symbol}
                  </p>
                  <p className="truncate text-xs text-text-muted">
                    {token.name}
                  </p>
                </div>
                {active ? (
                  <Check
                    size={16}
                    className="text-accent"
                    aria-hidden="true"
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
