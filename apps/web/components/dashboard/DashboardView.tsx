"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { Card } from "@/components/ui/Card";
import { LogoMark } from "@/components/layout/Logo";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { MyMarketsCard } from "./MyMarketsCard";
import { LendingAssetsCard } from "./LendingAssetsCard";
import { CollateralAssetsCard } from "./CollateralAssetsCard";
import { BorrowerView } from "./BorrowerView";
import { ActivateProfileCard } from "./ActivateProfileCard";
import { DashboardSkeleton } from "./DashboardSkeleton";
import { useProfileDelegation } from "@/hooks/useProfileDelegation";
import { cn } from "@/lib/utils";

type View = "lender" | "borrower";

export function DashboardView() {
  const { ready, authenticated } = usePrivy();
  const [view, setView] = useState<View>("lender");
  const { isDelegated, isResolved, profileAddress } = useProfileDelegation();

  // Loading: Privy SDK still booting, or user is authenticated but the
  // delegation lookup hasn't resolved yet (also covers "embedded wallet
  // address not yet surfaced"). We gate every dashboard branch on this to
  // prevent flashing sign-in → activate → lender on refresh.
  const isLoading =
    !ready || (authenticated && view === "lender" && !isResolved);

  const connected = ready && authenticated;
  const needsActivation =
    connected &&
    view === "lender" &&
    !!profileAddress &&
    isResolved &&
    !isDelegated;
  const missingProfileConfig =
    connected && view === "lender" && !profileAddress;

  return (
    <>
      <header className="mb-6">
        <h1 className="text-3xl font-semibold text-text-primary">Dashboard</h1>
        <h2 className="mt-2 max-w-2xl text-text-secondary">
          {!connected
            ? "Sign in to manage your markets, lending preferences, and loans."
            : view === "lender"
              ? "Manage what you lend, what you accept as collateral, and the markets you've created."
              : "Track your loans, monitor health factors, and repay positions."}
        </h2>
      </header>

      {isLoading ? (
        <DashboardSkeleton />
      ) : !connected ? (
        <Card className="flex flex-col items-center gap-5 py-12 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-bg-sunken">
            <LogoMark size={32} />
          </div>
          <div className="max-w-xl">
            <h3 className="text-lg font-semibold text-text-primary">
              Sign in to continue
            </h3>
            <p className="mx-auto mt-1 text-sm text-text-secondary">
              Sign in with email, a social account, or an existing wallet to
              see your markets, lending preferences, and open loans.
            </p>
          </div>
          <ConnectButton />

          {/* What signing in actually does — sit below the CTA so the
              primary action stays first. */}
          <div className="mt-2 grid w-full max-w-3xl gap-3 text-left sm:grid-cols-3">
            <ExplainerStep
              n={1}
              title="Sign in"
              body="Email, social, or an existing wallet via Privy. We create a Privy embedded wallet (an EOA you own) if you don't already have one."
            />
            <ExplainerStep
              n={2}
              title="Activate via EIP-7702"
              body="One type-4 transaction delegates that EOA to the BiviumProfile contract. Your address keeps every other use; the delegation just adds lender powers on top."
            />
            <ExplainerStep
              n={3}
              title="Lend or borrow"
              body="Set rates and accepted collateral to act as a lender. Browse the markets table and borrow against a collateral token. Repay any time. Deactivate to revoke the delegation."
            />
          </div>
          <p className="text-xs text-text-muted">
            EIP-7702 is the standard wallet upgrade that lets a plain EOA
            execute contract logic. No new account, no new keys.
          </p>
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
            missingProfileConfig ? (
              <Card className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <h3 className="text-lg font-semibold text-text-primary">
                  Profile template not configured
                </h3>
                <p className="mx-auto max-w-md text-sm text-text-secondary">
                  Set <span className="font-mono">NEXT_PUBLIC_BIVIUM_PROFILE_ADDRESS</span>{" "}
                  in <span className="font-mono">.env.local</span> to the
                  deployed BiviumProfile template, then refresh to start the
                  EIP-7702 activation flow.
                </p>
              </Card>
            ) : needsActivation ? (
              <ActivateProfileCard />
            ) : (
              <div className="flex flex-col gap-6">
                <MyMarketsCard />
                <div className="grid gap-6 lg:grid-cols-2">
                  <LendingAssetsCard />
                  <CollateralAssetsCard />
                </div>
              </div>
            )
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

function ExplainerStep({
  n,
  title,
  body,
}: {
  n: number;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-md border border-border bg-bg-sunken/60 p-4">
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border bg-bg text-xs font-semibold tabular-nums text-text-primary">
        {n}
      </span>
      <h4 className="mt-3 text-sm font-semibold text-text-primary">{title}</h4>
      <p className="mt-1 text-xs leading-snug text-text-secondary">{body}</p>
    </div>
  );
}
