"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ChainAwareButton } from "@/components/wallet/ChainAwareButton";
import { useDeactivateProfile } from "@/hooks/useActivateProfile";
import { useProfileDelegation } from "@/hooks/useProfileDelegation";
import { toast } from "@/lib/toast";
import { txAction } from "@/lib/explorer";
import { humanizeError } from "@/lib/errors";

interface DeactivateProfileModalProps {
  open: boolean;
  onClose: () => void;
}

// Confirmation + write flow for revoking the EIP-7702 delegation. Signs a
// fresh authorisation pointing at `address(0)` and broadcasts a type-4 tx
// through the existing 7702 plumbing (`useDeactivateProfile`). Lives in
// its own component so the WalletMenu in `ConnectButton` only has to know
// about an `open` boolean.
export function DeactivateProfileModal({
  open,
  onClose,
}: DeactivateProfileModalProps) {
  const delegation = useProfileDelegation();
  const deactivate = useDeactivateProfile();

  useEffect(() => {
    if (!deactivate.isSuccess) return;
    toast.success("bivium deactivated", {
      description:
        "Your wallet no longer delegates to the Bivium Profile. You can reactivate any time.",
      action: txAction(deactivate.hash),
    });
    delegation.refetch();
    deactivate.reset();
    onClose();
  }, [deactivate.isSuccess, deactivate, delegation, onClose]);

  useEffect(() => {
    if (!deactivate.error) return;
    toast.error("Deactivation failed", {
      description: humanizeError(deactivate.error),
    });
    deactivate.reset();
  }, [deactivate.error, deactivate]);

  const buttonLabel = (() => {
    switch (deactivate.status) {
      case "signing":
        return "Sign in wallet…";
      case "broadcasting":
        return "Broadcasting…";
      case "confirming":
        return "Confirming on-chain…";
      default:
        return "Confirm deactivation";
    }
  })();

  return (
    <Modal
      open={open}
      onClose={deactivate.isPending ? () => {} : onClose}
      title="Deactivate your bivium"
    >
      <p className="text-sm text-text-secondary">
        This signs an EIP-7702 authorisation pointing at{" "}
        <span className="font-mono">0x0000…0000</span> and broadcasts a
        type-4 transaction. Once confirmed, your EOA stops delegating to the
        Bivium Profile.
      </p>
      <div className="mt-4 flex gap-2 rounded-md border border-warn/30 bg-warn/10 p-3 text-xs text-text-secondary">
        <TriangleAlert
          size={16}
          className="mt-0.5 shrink-0 text-warn"
          aria-hidden="true"
        />
        <p>
          New lender writes (set rate, accept collateral, pause) will revert
          until you reactivate. Existing borrows against your markets are
          unaffected — borrowers can still repay.
        </p>
      </div>

      <div className="mt-6 flex gap-3">
        <Button
          variant="secondary"
          size="md"
          className="flex-1"
          onClick={onClose}
          disabled={deactivate.isPending}
        >
          Cancel
        </Button>
        <ChainAwareButton
          variant="danger"
          size="md"
          className="flex-1"
          onClick={() => deactivate.activate()}
          disabled={deactivate.isPending}
        >
          {buttonLabel}
        </ChainAwareButton>
      </div>
    </Modal>
  );
}
