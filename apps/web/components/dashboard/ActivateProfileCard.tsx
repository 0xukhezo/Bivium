"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LogoMark } from "@/components/layout/Logo";
import { OnboardingModal } from "./OnboardingModal";

/**
 * Lender-tab entry point shown when the connected wallet hasn't yet delegated
 * to the BiviumProfile via EIP-7702. Clicking Activate opens the onboarding
 * wizard (delegation → rates → collateral).
 */
export function ActivateProfileCard() {
  const [open, setOpen] = useState(false);
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
            Turn your wallet into a personal lending venue. One quick
            EIP-7702 delegation and you&apos;re live on the orderbook.
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={() => setOpen(true)}
        >
          Activate
        </Button>
      </Card>
      <OnboardingModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
