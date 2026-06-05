"use client";

import { Button, type ButtonProps } from "@/components/ui/Button";
import { useChainGuard } from "@/hooks/useChainGuard";

interface ChainAwareButtonProps extends ButtonProps {
  switchLabel?: string;
}

export function ChainAwareButton({
  onClick,
  children,
  switchLabel = "Switch to Arbitrum",
  disabled,
  ...rest
}: ChainAwareButtonProps) {
  const { needsSwitch, switchChain, isSwitching } = useChainGuard();

  if (needsSwitch) {
    return (
      <Button
        {...rest}
        onClick={switchChain}
        disabled={isSwitching}
        type="button"
      >
        {isSwitching ? "Switching…" : switchLabel}
      </Button>
    );
  }

  return (
    <Button {...rest} onClick={onClick} disabled={disabled}>
      {children}
    </Button>
  );
}
