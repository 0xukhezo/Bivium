"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface TooltipProps {
  /** Body of the tooltip. Plain text or JSX. */
  content: ReactNode;
  /** Aria label for the trigger. Defaults to "More info". */
  label?: string;
  /** Where the popover anchors relative to the trigger. */
  side?: "top" | "bottom";
  /**
   * Horizontal alignment of the popover. `"center"` is the default;
   * `"end"` right-aligns the popover with the trigger (use this near
   * right edges so the popover doesn't clip outside its scroll container).
   * `"start"` left-aligns it (use near left edges).
   */
  align?: "center" | "start" | "end";
  /** Trigger element. Defaults to a small `?` icon. */
  children?: ReactNode;
  className?: string;
}

// Lightweight hover/focus/tap tooltip. No portal — anchors absolutely to
// the trigger via the wrapping `inline-flex`'s containing block. Mobile
// taps toggle it; desktop hover + keyboard focus auto-open/close. Closes
// on outside click and Escape.
export function Tooltip({
  content,
  label = "More info",
  side = "top",
  align = "center",
  children,
  className,
}: TooltipProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onClickOutside);
    window.addEventListener("keydown", onEsc);
    return () => {
      window.removeEventListener("mousedown", onClickOutside);
      window.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  return (
    <span
      ref={wrapperRef}
      className={cn("relative inline-flex items-center", className)}
    >
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
        }}
        className="inline-flex shrink-0 cursor-help items-center rounded-full text-text-muted transition-colors duration-base ease-out-expo hover:text-text-secondary focus:text-text-secondary focus:outline-none"
      >
        {children ?? <HelpCircle size={12} aria-hidden="true" />}
      </button>
      {open ? (
        <span
          role="tooltip"
          className={cn(
            "pointer-events-none absolute z-50 w-max max-w-xs rounded-md border border-border bg-bg-elevated px-3 py-2 text-xs font-normal leading-snug text-text-secondary shadow-card",
            side === "top" ? "bottom-full mb-2" : "top-full mt-2",
            align === "center" && "left-1/2 -translate-x-1/2",
            align === "start" && "left-0",
            align === "end" && "right-0",
          )}
        >
          {content}
        </span>
      ) : null}
    </span>
  );
}
