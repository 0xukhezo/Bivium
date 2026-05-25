import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Placeholder mark — two crossing paths in Arbitrum blue + cyan, meeting at the
 * Latin pun. Replace with final artwork once available.
 */
export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2 text-text-primary",
        "focus-visible:outline-none",
        className,
      )}
      aria-label="Bivium, home"
    >
      <svg
        width={28}
        height={28}
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M3 24 L14 4"
          stroke="var(--color-arb-blue)"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <path
          d="M25 24 L14 4"
          stroke="var(--color-arb-cyan)"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <circle cx={14} cy={4} r={2.5} fill="var(--color-arb-white)" />
      </svg>
      <span className="text-lg font-semibold tracking-tight">bivium</span>
    </Link>
  );
}
