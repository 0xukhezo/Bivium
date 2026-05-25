import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  dense?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, interactive, dense, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        "bg-bg-elevated border border-border rounded-lg shadow-card",
        dense ? "p-4" : "p-6",
        interactive &&
          "transition-transform duration-base ease-out-expo hover:-translate-y-px",
        className,
      )}
      {...props}
    />
  );
});

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-4 flex items-center justify-between", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-lg font-semibold tracking-tight text-text-primary", className)}
      {...props}
    />
  );
}

export function CardLabel({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "text-xs uppercase tracking-widest text-text-muted",
        className,
      )}
      {...props}
    />
  );
}
