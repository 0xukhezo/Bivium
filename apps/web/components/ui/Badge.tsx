import { cn } from "@/lib/utils";

type Variant = "neutral" | "accent" | "success" | "warn" | "danger";

const variants: Record<Variant, string> = {
  neutral: "bg-bg-sunken text-text-secondary border border-border",
  accent: "bg-accent/10 text-accent border border-accent/30",
  success: "bg-success/10 text-success border border-success/30",
  warn: "bg-warn/10 text-warn border border-warn/30",
  danger: "bg-danger/10 text-danger border border-danger/30",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

export function Badge({ variant = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill px-2.5 py-1 text-xs font-medium tabular-nums",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
