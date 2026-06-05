"use client";

import { useEffect, useState } from "react";
import { Copy, ExternalLink, TriangleAlert } from "lucide-react";
import { useBalance } from "wagmi";
import { arbitrum } from "wagmi/chains";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ChainAwareButton } from "@/components/wallet/ChainAwareButton";
import { LogoMark } from "@/components/layout/Logo";
import { useActivateProfile } from "@/hooks/useActivateProfile";
import { useProfileDelegation } from "@/hooks/useProfileDelegation";
import { useEmbeddedAddress } from "@/hooks/useEmbeddedAddress";
import { truncateAddress } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { humanizeError } from "@/lib/errors";

interface OnboardingModalProps {
  open: boolean;
  onClose: () => void;
}

export function OnboardingModal({ open, onClose }: OnboardingModalProps) {
  const delegation = useProfileDelegation();
  const activation = useActivateProfile();
  const embeddedAddress = useEmbeddedAddress();

  useEffect(() => {
    if (open) activation.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!activation.isSuccess) return;
    toast.success("bivium activated", {
      description: "Your wallet is now delegated to the Bivium Profile.",
    });
    delegation.refetch();
    onClose();
  }, [activation.isSuccess, delegation, onClose]);

  useEffect(() => {
    if (!activation.error) return;
    toast.error("Activation failed", {
      description: humanizeError(activation.error),
    });
  }, [activation.error]);

  const buttonLabel = (() => {
    switch (activation.status) {
      case "signing":
        return "Sign in wallet…";
      case "broadcasting":
        return "Broadcasting…";
      case "confirming":
        return "Confirming on-chain…";
      default:
        return "Activate";
    }
  })();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Activate your bivium"
      className="max-w-[480px]"
    >
      <div className="flex flex-col gap-5">
        <div className="grid h-16 w-16 place-items-center self-center rounded-full bg-bg-sunken">
          <LogoMark size={32} />
        </div>
        <p className="text-center text-sm text-text-secondary">
          One EIP-7702 transaction delegates your wallet to the BiviumProfile
          template. After it lands you&apos;ll see the lender dashboard every
          time you sign in.
        </p>

        <PrivyWalletFundingPanel
          address={embeddedAddress}
          profileAddress={delegation.profileAddress}
        />

        {activation.hash ? (
          <a
            href={`https://arbiscan.io/tx/${activation.hash}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 self-center text-xs text-accent hover:text-accent-hover"
          >
            <ExternalLink size={12} />
            View activation tx on Arbiscan
          </a>
        ) : null}

        {activation.error ? (
          <ErrorBox>{humanizeError(activation.error)}</ErrorBox>
        ) : null}

        <div className="flex gap-3">
          <Button
            variant="secondary"
            size="md"
            className="flex-1"
            onClick={onClose}
            disabled={activation.isPending}
          >
            Not now
          </Button>
          <ChainAwareButton
            variant="primary"
            size="md"
            className="flex-1"
            onClick={() => activation.activate()}
            disabled={!delegation.profileAddress || activation.isPending}
          >
            {buttonLabel}
          </ChainAwareButton>
        </div>
      </div>
    </Modal>
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

// Minimum ETH balance heuristic for the 7702 activation tx — even at a few
// gwei a type-0x04 set-code tx on Arbitrum sits around 0.00005 ETH.
const MIN_ETH_WEI = 100_000_000_000_000n; // 0.0001 ETH

function PrivyWalletFundingPanel({
  address,
  profileAddress,
}: {
  address: `0x${string}` | undefined;
  profileAddress: `0x${string}` | undefined;
}) {
  const balance = useBalance({
    address,
    chainId: arbitrum.id,
    query: { enabled: !!address },
  });
  const [copied, setCopied] = useState(false);

  const underfunded = balance.data ? balance.data.value < MIN_ETH_WEI : false;

  const onCopy = () => {
    if (!address) return;
    navigator.clipboard?.writeText(address);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="rounded-md border border-border bg-bg p-3 text-xs">
      <div className="flex items-baseline justify-between">
        <p className="text-text-muted">Privy embedded wallet</p>
        <p className="font-mono text-text-muted">Arbitrum</p>
      </div>
      <div className="mt-1 flex items-center justify-between gap-2">
        <p className="truncate font-mono text-text-primary" title={address}>
          {address ? truncateAddress(address, 6) : "—"}
        </p>
        {address ? (
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex items-center gap-1 rounded-sm border border-border bg-bg-elevated px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-text-muted transition-colors duration-base ease-out-expo hover:border-accent hover:text-text-primary"
          >
            {copied ? "Copied" : <Copy size={11} aria-hidden />}
          </button>
        ) : null}
      </div>

      <div className="mt-3 flex items-baseline justify-between">
        <p className="text-text-muted">ETH balance</p>
        <p className="font-mono tabular-nums text-text-primary">
          {balance.isLoading
            ? "…"
            : balance.data
              ? `${formatEthBalance(balance.data.value)} ETH`
              : "—"}
        </p>
      </div>

      <p className="mt-3 text-text-muted">Delegates to</p>
      <p className="mt-1 font-mono text-text-primary" title={profileAddress}>
        {profileAddress ? truncateAddress(profileAddress) : "Not configured"}
      </p>

      {underfunded ? (
        <div className="mt-3 flex gap-2 rounded-md border border-warn/30 bg-warn/10 p-2 text-text-secondary">
          <TriangleAlert
            size={14}
            className="mt-0.5 shrink-0 text-warn"
            aria-hidden
          />
          <p>
            Send a tiny amount of ETH on Arbitrum to the address above to cover
            gas, then click Activate.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function formatEthBalance(wei: bigint): string {
  const eth = Number(wei) / 1e18;
  if (eth === 0) return "0";
  if (eth < 0.0001) return "<0.0001";
  return eth.toLocaleString(undefined, { maximumFractionDigits: 4 });
}
