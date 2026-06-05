"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LogoMark } from "@/components/layout/Logo";
import { useProfileDelegation } from "@/hooks/useProfileDelegation";
import { truncateAddress } from "@/lib/utils";
import { OnboardingModal } from "./OnboardingModal";

export function ActivateProfileCard() {
  const [open, setOpen] = useState(false);
  const { address, delegatedTo, profileAddress, rawCode } =
    useProfileDelegation();

  const arbiscanUrl = address ? `https://arbiscan.io/address/${address}` : null;

  return (
    <>
      <Card className="flex flex-col items-center justify-center gap-5 py-16 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-bg-sunken">
          <LogoMark size={32} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-text-primary">
            Activate your bivium
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-text-secondary">
            Turn your wallet into a personal lending venue. One quick EIP-7702
            delegation and you&apos;re live on the orderbook.
          </p>
        </div>

        {address ? (
          <div className="flex w-full max-w-md flex-col gap-2 rounded-md border border-border bg-bg-sunken p-4 text-left text-xs">
            <Row label="Privy embedded wallet" value={truncateAddress(address)} />
            <Row
              label="Expected Profile"
              value={
                profileAddress ? truncateAddress(profileAddress) : "not set"
              }
            />
            <Row
              label="Currently delegates to"
              value={
                delegatedTo ? truncateAddress(delegatedTo) : "not delegated"
              }
              danger={!delegatedTo}
            />
            <div className="flex flex-col gap-1 border-t border-border pt-2">
              <span className="text-text-muted">Raw getCode response</span>
              <code className="break-all font-mono text-[10px] text-text-secondary">
                {rawCode ?? "loading…"}
              </code>
            </div>
            {arbiscanUrl ? (
              <a
                href={arbiscanUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center gap-1 self-start text-xs text-accent hover:text-accent-hover"
              >
                <ExternalLink size={12} />
                View on Arbiscan
              </a>
            ) : null}
          </div>
        ) : null}

        <Button variant="primary" size="md" onClick={() => setOpen(true)}>
          Activate
        </Button>
      </Card>
      <OnboardingModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function Row({
  label,
  value,
  danger,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-text-muted">{label}</span>
      <span
        className={
          danger
            ? "font-mono tabular-nums text-danger"
            : "font-mono tabular-nums text-text-primary"
        }
      >
        {value}
      </span>
    </div>
  );
}
