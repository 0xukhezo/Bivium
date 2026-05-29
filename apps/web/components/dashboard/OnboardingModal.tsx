"use client";

import { useEffect, useState } from "react";
import { Check, TriangleAlert } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { LogoMark } from "@/components/layout/Logo";
import { useActivateProfile } from "@/hooks/useActivateProfile";
import { useProfileDelegation } from "@/hooks/useProfileDelegation";
import {
  useSetAllowedCollaterals,
  useSetRate,
} from "@/hooks/useLenderProfileWrite";
import {
  AVAILABLE_COLLATERAL_ASSETS,
  AVAILABLE_LEND_ASSETS,
} from "@/lib/lender";
import type { Token } from "@/lib/tokens";
import { cn, truncateAddress } from "@/lib/utils";

interface OnboardingModalProps {
  open: boolean;
  onClose: () => void;
}

type Step =
  | "intro"
  | "delegating"
  | "pick-rates"
  | "submitting-rates"
  | "pick-collateral"
  | "submitting-collateral"
  | "done";

interface RateDraft {
  token: Token;
  rateInput: string; // raw string to keep typing-friendly (matches LendingAssetsCard pattern)
}

export function OnboardingModal({ open, onClose }: OnboardingModalProps) {
  const delegation = useProfileDelegation();
  const activation = useActivateProfile();
  const setRate = useSetRate();
  const setAllowedCollaterals = useSetAllowedCollaterals();

  // The starting step depends on the wallet's current delegation status:
  // a returning user (delegated but missing rates/collateral) lands in
  // pick-rates so they can finish onboarding without re-delegating.
  const [step, setStep] = useState<Step>(
    delegation.isDelegated ? "pick-rates" : "intro",
  );

  // Step 2 state — selected lend assets + rate inputs
  const [rateDrafts, setRateDrafts] = useState<RateDraft[]>([]);
  const [submittedRates, setSubmittedRates] = useState<Set<string>>(new Set());
  const [pendingRateIndex, setPendingRateIndex] = useState<number | null>(null);

  // Step 3 state — selected collateral
  const [selectedCollateral, setSelectedCollateral] = useState<Set<string>>(
    new Set(),
  );

  // Reset on open so a re-opened modal starts fresh.
  useEffect(() => {
    if (open) {
      setStep(delegation.isDelegated ? "pick-rates" : "intro");
      setRateDrafts([]);
      setSubmittedRates(new Set());
      setPendingRateIndex(null);
      setSelectedCollateral(new Set());
      activation.reset();
      setRate.reset();
      setAllowedCollaterals.reset();
    }
    // We intentionally don't depend on `delegation.isDelegated` here — it
    // only matters at the moment the modal opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Drive the delegating → pick-rates transition off activation status.
  useEffect(() => {
    if (step === "delegating" && activation.isSuccess) {
      delegation.refetch();
      setStep("pick-rates");
    }
  }, [step, activation.isSuccess, delegation]);

  // Drive the rate-submission sequence.
  useEffect(() => {
    if (step !== "submitting-rates") return;
    if (pendingRateIndex === null) return;
    const draft = rateDrafts[pendingRateIndex];
    if (!draft) return;
    // Trigger setRate for the current index when arriving here.
    if (!setRate.hash && !setRate.isPending && !setRate.isConfirming) {
      const parsed = parseFloat(draft.rateInput);
      const annual = Number.isNaN(parsed) ? 0 : Math.max(0, parsed) / 100;
      setRate.setRate(draft.token.address, annual);
    }
    // Advance once the current setRate confirms.
    if (setRate.isSuccess) {
      setSubmittedRates((prev) => {
        const next = new Set(prev);
        next.add(draft.token.address.toLowerCase());
        return next;
      });
      const nextIndex = pendingRateIndex + 1;
      setRate.reset();
      if (nextIndex >= rateDrafts.length) {
        setPendingRateIndex(null);
        setStep("pick-collateral");
      } else {
        setPendingRateIndex(nextIndex);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, pendingRateIndex, setRate.isSuccess, setRate.isPending, setRate.isConfirming, setRate.hash]);

  // Drive the collateral-submission transition.
  useEffect(() => {
    if (step === "submitting-collateral" && setAllowedCollaterals.isSuccess) {
      setStep("done");
    }
  }, [step, setAllowedCollaterals.isSuccess]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={titleForStep(step)}
      className="max-w-[560px]"
    >
      {step === "intro" ? (
        <IntroStep
          address={delegation.address ?? undefined}
          profileAddress={delegation.profileAddress}
          error={activation.error}
          notSupported={activation.notSupported}
          isPending={activation.isPending}
          onActivate={() => {
            setStep("delegating");
            activation.activate();
          }}
          onClose={onClose}
        />
      ) : null}

      {step === "delegating" ? (
        <DelegatingStep
          isConfirming={activation.isConfirming}
          error={activation.error}
          onRetry={() => setStep("intro")}
        />
      ) : null}

      {step === "pick-rates" ? (
        <PickRatesStep
          drafts={rateDrafts}
          onChange={setRateDrafts}
          onSubmit={() => {
            if (rateDrafts.length === 0) {
              setStep("pick-collateral");
              return;
            }
            setStep("submitting-rates");
            setPendingRateIndex(0);
          }}
          onSkip={() => setStep("pick-collateral")}
          onClose={onClose}
        />
      ) : null}

      {step === "submitting-rates" ? (
        <SubmittingRatesStep
          drafts={rateDrafts}
          submitted={submittedRates}
          pendingIndex={pendingRateIndex}
          error={setRate.error}
          onRetry={() => {
            setRate.reset();
            // re-trigger the effect by nudging pendingIndex
            setPendingRateIndex((i) => i);
          }}
          onCancel={() => {
            setRate.reset();
            setPendingRateIndex(null);
            setStep("pick-rates");
          }}
        />
      ) : null}

      {step === "pick-collateral" ? (
        <PickCollateralStep
          selected={selectedCollateral}
          onChange={setSelectedCollateral}
          onSubmit={() => {
            if (selectedCollateral.size === 0) {
              setStep("done");
              return;
            }
            const list = AVAILABLE_COLLATERAL_ASSETS.filter((t) =>
              selectedCollateral.has(t.address.toLowerCase()),
            ).map((t) => t.address);
            setStep("submitting-collateral");
            setAllowedCollaterals.setAllowedCollaterals(list);
          }}
          onSkip={() => setStep("done")}
        />
      ) : null}

      {step === "submitting-collateral" ? (
        <SubmittingCollateralStep
          isConfirming={setAllowedCollaterals.isConfirming}
          error={setAllowedCollaterals.error}
          onRetry={() => {
            setAllowedCollaterals.reset();
            setStep("pick-collateral");
          }}
        />
      ) : null}

      {step === "done" ? (
        <DoneStep
          rateDrafts={rateDrafts}
          submittedRates={submittedRates}
          collateralCount={selectedCollateral.size}
          onClose={() => {
            delegation.refetch();
            onClose();
          }}
        />
      ) : null}
    </Modal>
  );
}

function titleForStep(step: Step): string {
  switch (step) {
    case "intro":
      return "Activate your bivium";
    case "delegating":
      return "Activating…";
    case "pick-rates":
      return "Set your rates";
    case "submitting-rates":
      return "Saving rates…";
    case "pick-collateral":
      return "Accept collateral";
    case "submitting-collateral":
      return "Saving collateral…";
    case "done":
      return "You're live";
  }
}

/* ─────────────────────────── intro ─────────────────────────── */

function IntroStep({
  address,
  profileAddress,
  error,
  notSupported,
  isPending,
  onActivate,
  onClose,
}: {
  address: `0x${string}` | undefined;
  profileAddress: `0x${string}` | undefined;
  error: Error | null;
  notSupported: boolean;
  isPending: boolean;
  onActivate: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid h-16 w-16 place-items-center self-center rounded-full bg-bg-sunken">
        <LogoMark size={32} />
      </div>
      <div className="text-center">
        <p className="text-sm text-text-secondary">
          Bivium turns your EOA into a personal lending venue using EIP-7702.
          One transaction installs the BiviumProfile delegation on your
          address; your funds stay in your wallet and you can revoke at any
          time.
        </p>
      </div>
      <ul className="flex flex-col gap-2 text-sm text-text-secondary">
        <Bullet>Your private key still controls everything.</Bullet>
        <Bullet>No new address — your wallet IS the venue.</Bullet>
        <Bullet>Revocable anytime via a follow-up authorization.</Bullet>
      </ul>
      <div className="rounded-md border border-border bg-bg p-3 text-xs">
        <p className="text-text-muted">Connected EOA</p>
        <p className="mt-1 font-mono text-text-primary" title={address}>
          {address ? truncateAddress(address) : "—"}
        </p>
        <p className="mt-3 text-text-muted">Delegates to</p>
        <p className="mt-1 font-mono text-text-primary" title={profileAddress}>
          {profileAddress ? truncateAddress(profileAddress) : "Not configured"}
        </p>
      </div>
      {notSupported ? (
        <ErrorBox>
          Your wallet doesn&apos;t support EIP-7702 yet. Update to MetaMask 12+
          or Coinbase Wallet 31+ and try again.
        </ErrorBox>
      ) : error ? (
        <ErrorBox>{error.message}</ErrorBox>
      ) : null}
      <div className="flex gap-3">
        <Button
          variant="secondary"
          size="md"
          className="flex-1"
          onClick={onClose}
        >
          Not now
        </Button>
        <Button
          variant="primary"
          size="md"
          className="flex-1"
          onClick={onActivate}
          disabled={!profileAddress || isPending}
        >
          {isPending ? "Confirming…" : "Activate"}
        </Button>
      </div>
    </div>
  );
}

/* ───────────────────────── delegating ───────────────────────── */

function DelegatingStep({
  isConfirming,
  error,
  onRetry,
}: {
  isConfirming: boolean;
  error: Error | null;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-4 text-center">
      <Spinner />
      <p className="text-sm text-text-secondary">
        {isConfirming
          ? "Waiting for confirmation on Arbitrum…"
          : "Sign the authorization in your wallet, then approve the activation transaction."}
      </p>
      {error ? (
        <>
          <ErrorBox>{error.message}</ErrorBox>
          <Button variant="secondary" size="md" onClick={onRetry}>
            Try again
          </Button>
        </>
      ) : null}
    </div>
  );
}

/* ───────────────────────── pick-rates ───────────────────────── */

function PickRatesStep({
  drafts,
  onChange,
  onSubmit,
  onSkip,
  onClose,
}: {
  drafts: RateDraft[];
  onChange: (next: RateDraft[]) => void;
  onSubmit: () => void;
  onSkip: () => void;
  onClose: () => void;
}) {
  const toggle = (token: Token) => {
    const key = token.address.toLowerCase();
    if (drafts.some((d) => d.token.address.toLowerCase() === key)) {
      onChange(drafts.filter((d) => d.token.address.toLowerCase() !== key));
    } else {
      onChange([...drafts, { token, rateInput: "5.00" }]);
    }
  };

  const setInput = (address: string, raw: string) => {
    onChange(
      drafts.map((d) =>
        d.token.address.toLowerCase() === address.toLowerCase()
          ? { ...d, rateInput: raw }
          : d,
      ),
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-text-secondary">
        Pick which assets you&apos;ll lend and the fixed rate per asset. Each
        is a separate transaction.
      </p>
      <ul className="flex flex-col gap-2">
        {AVAILABLE_LEND_ASSETS.map((token) => {
          const draft = drafts.find(
            (d) => d.token.address.toLowerCase() === token.address.toLowerCase(),
          );
          return (
            <li key={token.address}>
              <div
                className={cn(
                  "rounded-md border border-border bg-bg p-3 transition-colors duration-base ease-out-expo",
                  draft && "border-accent",
                )}
              >
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={Boolean(draft)}
                    aria-label={`Toggle ${token.symbol}`}
                    onClick={() => toggle(token)}
                    className={cn(
                      "grid h-5 w-5 shrink-0 place-items-center rounded border transition-colors duration-base ease-out-expo",
                      draft
                        ? "border-accent bg-accent text-arb-white"
                        : "border-border bg-bg-elevated hover:border-accent",
                    )}
                  >
                    {draft ? <Check size={12} strokeWidth={3} aria-hidden="true" /> : null}
                  </button>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={token.iconUrl}
                    alt=""
                    aria-hidden="true"
                    width={24}
                    height={24}
                    className="h-6 w-6 shrink-0 rounded-full object-contain"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-text-primary">
                      {token.symbol}
                    </p>
                    <p className="truncate text-xs text-text-muted">
                      {token.name}
                    </p>
                  </div>
                  {draft ? (
                    <label className="flex items-center gap-1.5">
                      <span className="sr-only">
                        Rate for {token.symbol} in percent
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={draft.rateInput}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (raw === "" || /^\d*\.?\d*$/.test(raw)) {
                            setInput(token.address, raw);
                          }
                        }}
                        className="h-10 w-20 rounded-md border border-border bg-bg-elevated px-2 text-right text-sm tabular-nums text-text-primary focus:border-accent focus:outline-none"
                      />
                      <span className="text-sm text-text-muted">%</span>
                    </label>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="flex gap-3">
        <Button
          variant="secondary"
          size="md"
          className="flex-1"
          onClick={drafts.length === 0 ? onClose : onSkip}
        >
          {drafts.length === 0 ? "Close" : "Skip"}
        </Button>
        <Button
          variant="primary"
          size="md"
          className="flex-1"
          onClick={onSubmit}
          disabled={drafts.length === 0}
        >
          {drafts.length === 0
            ? "Pick at least one"
            : drafts.length === 1
              ? "Save rate"
              : `Save ${drafts.length} rates`}
        </Button>
      </div>
    </div>
  );
}

/* ─────────────────── submitting-rates ─────────────────── */

function SubmittingRatesStep({
  drafts,
  submitted,
  pendingIndex,
  error,
  onRetry,
  onCancel,
}: {
  drafts: RateDraft[];
  submitted: Set<string>;
  pendingIndex: number | null;
  error: Error | null;
  onRetry: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-text-secondary">
        Each rate is one transaction. Approve them in your wallet as they come
        up.
      </p>
      <ul className="flex flex-col gap-2">
        {drafts.map((d, i) => {
          const done = submitted.has(d.token.address.toLowerCase());
          const active = pendingIndex === i;
          return (
            <li
              key={d.token.address}
              className="flex items-center gap-3 rounded-md border border-border bg-bg p-3"
            >
              <div
                className={cn(
                  "grid h-5 w-5 shrink-0 place-items-center rounded-full border",
                  done && "border-success bg-success/10 text-success",
                  active && !done && "border-accent",
                  !done && !active && "border-border",
                )}
              >
                {done ? <Check size={12} strokeWidth={3} aria-hidden="true" /> : null}
                {active && !done ? <Spinner size={12} /> : null}
              </div>
              <span className="text-sm text-text-primary">
                {d.token.symbol} · {d.rateInput}%
              </span>
            </li>
          );
        })}
      </ul>
      {error ? (
        <>
          <ErrorBox>{error.message}</ErrorBox>
          <div className="flex gap-3">
            <Button variant="secondary" size="md" className="flex-1" onClick={onCancel}>
              Back
            </Button>
            <Button variant="primary" size="md" className="flex-1" onClick={onRetry}>
              Try again
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}

/* ─────────────────── pick-collateral ─────────────────── */

function PickCollateralStep({
  selected,
  onChange,
  onSubmit,
  onSkip,
}: {
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  onSubmit: () => void;
  onSkip: () => void;
}) {
  const toggle = (token: Token) => {
    const key = token.address.toLowerCase();
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-text-secondary">
        Pick which assets you&apos;ll accept as collateral against your loans.
        This is one bulk-replace transaction.
      </p>
      <ul className="flex flex-col gap-2">
        {AVAILABLE_COLLATERAL_ASSETS.map((token) => {
          const checked = selected.has(token.address.toLowerCase());
          return (
            <li key={token.address}>
              <button
                type="button"
                role="checkbox"
                aria-checked={checked}
                onClick={() => toggle(token)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md border bg-bg p-3 text-left transition-colors duration-base ease-out-expo",
                  checked
                    ? "border-accent"
                    : "border-border hover:border-accent",
                )}
              >
                <span
                  className={cn(
                    "grid h-5 w-5 shrink-0 place-items-center rounded border transition-colors duration-base ease-out-expo",
                    checked
                      ? "border-accent bg-accent text-arb-white"
                      : "border-border bg-bg-elevated",
                  )}
                >
                  {checked ? <Check size={12} strokeWidth={3} aria-hidden="true" /> : null}
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={token.iconUrl}
                  alt=""
                  aria-hidden="true"
                  width={24}
                  height={24}
                  className="h-6 w-6 shrink-0 rounded-full object-contain"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-text-primary">{token.symbol}</p>
                  <p className="truncate text-xs text-text-muted">
                    {token.name}
                  </p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="flex gap-3">
        <Button
          variant="secondary"
          size="md"
          className="flex-1"
          onClick={onSkip}
        >
          Skip
        </Button>
        <Button
          variant="primary"
          size="md"
          className="flex-1"
          onClick={onSubmit}
          disabled={selected.size === 0}
        >
          {selected.size === 0
            ? "Pick at least one"
            : `Save ${selected.size} collateral`}
        </Button>
      </div>
    </div>
  );
}

/* ─────────────────── submitting-collateral ─────────────────── */

function SubmittingCollateralStep({
  isConfirming,
  error,
  onRetry,
}: {
  isConfirming: boolean;
  error: Error | null;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-4 text-center">
      <Spinner />
      <p className="text-sm text-text-secondary">
        {isConfirming
          ? "Waiting for confirmation…"
          : "Approve the collateral transaction in your wallet."}
      </p>
      {error ? (
        <>
          <ErrorBox>{error.message}</ErrorBox>
          <Button variant="secondary" size="md" onClick={onRetry}>
            Back
          </Button>
        </>
      ) : null}
    </div>
  );
}

/* ──────────────────────────── done ──────────────────────────── */

function DoneStep({
  rateDrafts,
  submittedRates,
  collateralCount,
  onClose,
}: {
  rateDrafts: RateDraft[];
  submittedRates: Set<string>;
  collateralCount: number;
  onClose: () => void;
}) {
  const ratesCount = rateDrafts.filter((d) =>
    submittedRates.has(d.token.address.toLowerCase()),
  ).length;
  return (
    <div className="flex flex-col items-center gap-4 py-4 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-full bg-success/10 text-success">
        <Check size={28} strokeWidth={3} aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold text-text-primary">
        Your bivium is live
      </h3>
      <p className="max-w-sm text-sm text-text-secondary">
        Your EOA is now delegated to BiviumProfile.
        {ratesCount > 0
          ? ` Rates set for ${ratesCount} asset${ratesCount === 1 ? "" : "s"}.`
          : ""}
        {collateralCount > 0
          ? ` Accepting ${collateralCount} collateral type${collateralCount === 1 ? "" : "s"}.`
          : ""}
      </p>
      <Button variant="primary" size="md" onClick={onClose}>
        Go to dashboard
      </Button>
    </div>
  );
}

/* ─────────────────────── small primitives ─────────────────────── */

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <Check
        size={14}
        strokeWidth={3}
        className="mt-1 shrink-0 text-accent"
        aria-hidden="true"
      />
      <span>{children}</span>
    </li>
  );
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 rounded-md border border-warn/30 bg-warn/10 p-3 text-xs text-text-secondary">
      <TriangleAlert
        size={16}
        className="mt-0.5 shrink-0 text-warn"
        aria-hidden="true"
      />
      <p>{children}</p>
    </div>
  );
}

function Spinner({ size = 24 }: { size?: number }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className="inline-block animate-spin rounded-full border-2 border-border border-t-accent"
      style={{ width: size, height: size }}
    />
  );
}
