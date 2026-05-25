import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  prefixSlot?: React.ReactNode;
  suffixSlot?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, prefixSlot, suffixSlot, type = "text", ...props },
  ref,
) {
  return (
    <label
      className={cn(
        "flex h-11 items-center gap-2 rounded-md border border-border bg-bg px-3",
        "focus-within:border-accent",
        className,
      )}
    >
      {prefixSlot ? <div className="shrink-0 text-text-muted">{prefixSlot}</div> : null}
      <input
        ref={ref}
        type={type}
        className={cn(
          "w-full bg-transparent text-base text-text-primary placeholder:text-text-muted focus:outline-none",
          type === "number" && "text-right tabular-nums",
        )}
        {...props}
      />
      {suffixSlot ? <div className="shrink-0">{suffixSlot}</div> : null}
    </label>
  );
});
