"use client";

import { useEffect, useState } from "react";
import { TriangleAlert } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ChainAwareButton } from "@/components/wallet/ChainAwareButton";
import { useDeactivateProfile } from "@/hooks/useActivateProfile";
import { useProfileDelegation } from "@/hooks/useProfileDelegation";
import { toast } from "@/lib/toast";
import { txAction } from "@/lib/explorer";
import { humanizeError } from "@/lib/errors";

// Lender-tab footer that lets the user revoke their EIP-7702 delegation.
// Signs a fresh authorisation pointing at `address(0)` via the existing
// 7702 plumbing, then `eth_getCode(eoa)` returns `0x` again and the
// dashboard re-routes to the activation screen on next render.
export function DeactivateProfileCard() {
  const delegation = useProfileDelegation();
  const deactivate = useDeactivateProfile();
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!deactivate.isSuccess) return;
    toast.success("bivium deactivated", {
      description:
        "Your wallet no longer delegates to the Bivium Profile. You can reactivate any time.",
      action: txAction(deactivate.hash),
    });
    delegation.refetch();
    deactivate.reset();
    setConfirmOpen(false);
  }, [deactivate.isSuccess, deactivate, delegation]);

  useEffect(() => {
    if (!deactivate.error) return;
    toast.error("Deactivation failed", {
      description: humanizeError(deactivate.error),
    });
    deactivate.reset();
  }, [deactivate.error, deactivate]);

  return (
    <>
      <Card className="border-danger/30 bg-danger/5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <TriangleAlert
              size={18}
              className="mt-0.5 shrink-0 text-danger"
              aria-hidden="true"
            />
            <div>
              <h3 className="text-sm font-semibold text-text-primary">
                Deactivate bivium
              </h3>
              <p className="mt-1 max-w-md text-xs text-text-secondary">
                Revokes the EIP-7702 delegation on your wallet. Existing
                borrower positions stay open (they reference the market
                params, not your live profile), but new lender actions stop
                until you reactivate.
              </p>
            </div>
          </div>
          <Button
            variant="danger"
            size="md"
            className="shrink-0"
            onClick={() => setConfirmOpen(true)}
            disabled={deactivate.isPending}
          >
            Deactivate
          </Button>
        </div>
      </Card>

      <Modal
        open={confirmOpen}
        onClose={
          deactivate.isPending ? () => {} : () => setConfirmOpen(false)
        }
        title="Deactivate your bivium"
      >
        <p className="text-sm text-text-secondary">
          This signs an EIP-7702 authorisation pointing at{" "}
          <span className="font-mono">0x0000…0000</span> and broadcasts a
          type-4 transaction. Once confirmed, your EOA stops delegating to
          the Bivium Profile.
        </p>
        <div className="mt-4 flex gap-2 rounded-md border border-warn/30 bg-warn/10 p-3 text-xs text-text-secondary">
          <TriangleAlert
            size={16}
            className="mt-0.5 shrink-0 text-warn"
            aria-hidden="true"
          />
          <p>
            New lender writes (set rate, accept collateral, pause) will
            revert until you reactivate. Existing borrows against your
            markets are unaffected — borrowers can still repay.
          </p>
        </div>

        <div className="mt-6 flex gap-3">
          <Button
            variant="secondary"
            size="md"
            className="flex-1"
            onClick={() => setConfirmOpen(false)}
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
            {(() => {
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
            })()}
          </ChainAwareButton>
        </div>
      </Modal>
    </>
  );
}
