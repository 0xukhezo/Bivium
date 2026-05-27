"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { Card } from "@/components/ui/Card";
import { LogoMark } from "@/components/layout/Logo";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { useMounted } from "@/hooks/useMounted";
import { MyMarketsCard } from "./MyMarketsCard";
import { LendingAssetsCard } from "./LendingAssetsCard";
import { CollateralAssetsCard } from "./CollateralAssetsCard";
import { BorrowerView } from "./BorrowerView";
import { cn } from "@/lib/utils";

type View = "lender" | "borrower";

export function DashboardView() {
  const mounted = useMounted();
  const { isConnected } = useAccount();
  const [view, setView] = useState<View>("lender");

  // Gate behind a real connection; the mounted guard keeps SSR and the first
  // client render in sync (both show the prompt) to avoid hydration mismatch.
  const connected = mounted && isConnected;

  return (
    <>
      <header className="mb-6">
        <h1 className="text-3xl font-semibold text-text-primary">Dashboard</h1>
        <h2 className="mt-2 max-w-xl text-text-secondary">
          {!connected
            ? "Connect your wallet to manage your markets, lending preferences, and loans."
            : view === "lender"
              ? "Manage what you lend, what you accept as collateral, and the markets you've created."
              : "Track your loans, monitor health factors, and repay positions."}
        </h2>
      </header>

      {!connected ? (
        <Card className="flex flex-col items-center justify-center gap-5 py-16 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-bg-sunken">
            <LogoMark size={32} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-text-primary">
              Please connect your wallet
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-text-secondary">
              Connect your wallet to see your markets, lending preferences, and
              open loans.
            </p>
          </div>
          <ConnectButton />
        </Card>
      ) : (
        <>
          <div
            role="tablist"
            aria-label="Dashboard role"
            className="mb-6 inline-flex rounded-md border border-border bg-bg-elevated p-1"
          >
            <TabButton
              active={view === "lender"}
              onClick={() => setView("lender")}
            >
              Lender
            </TabButton>
            <TabButton
              active={view === "borrower"}
              onClick={() => setView("borrower")}
            >
              Borrower
            </TabButton>
          </div>

          {view === "lender" ? (
            <div className="flex flex-col gap-6">
              <MyMarketsCard />
              <div className="grid gap-6 lg:grid-cols-2">
                <LendingAssetsCard />
                <CollateralAssetsCard />
              </div>
            </div>
          ) : (
            <BorrowerView />
          )}
        </>
      )}
    </>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function TabButton({ active, onClick, children }: TabButtonProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "h-9 rounded-sm px-4 text-sm font-medium transition-colors duration-base ease-out-expo",
        active
          ? "bg-bg text-text-primary shadow-card"
          : "text-text-secondary hover:text-text-primary",
      )}
    >
      {children}
    </button>
  );
}
