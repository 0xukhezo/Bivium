import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  "aria-label": string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { className, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-pill text-text-secondary",
        "hover:bg-bg-elevated hover:text-text-primary transition-colors duration-base ease-out-expo",
        "focus-visible:outline-none",
        className,
      )}
      {...props}
    />
  );
});
