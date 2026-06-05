import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({
  size = 28,
  className,
  tone = "primary",
}: {
  size?: number;
  className?: string;
  tone?: "primary" | "white";
}) {
  const ink = tone === "white" ? "#ffffff" : "currentColor";
  const accent = "var(--color-arb-cyan)";
  const strokeW = size >= 48 ? 3.2 : size >= 24 ? 2.4 : 1.6;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <g transform="translate(32 32)">
        {[0, 120, 240].map((deg, i) => {
          const fill = i === 0 ? accent : ink;
          const opacity = i === 0 ? 0.95 : 0.92 - i * 0.12;
          return (
            <g key={deg} transform={`rotate(${deg})`}>
              <path
                d="M 0 -4 L 24 -22 A 26 26 0 0 1 22 6 Z"
                fill={fill}
                stroke={fill}
                strokeWidth={strokeW}
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity={opacity}
              />
            </g>
          );
        })}
      </g>
    </svg>
  );
}

export function Logo({
  className,
  href = "/",
  size = 40,
}: {
  className?: string;
  href?: string;
  size?: number;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-3 text-text-primary",
        "focus-visible:outline-none",
        className,
      )}
      aria-label="Bivium, home"
    >
      <LogoMark size={size} />
      <span className="font-display text-2xl font-semibold tracking-[-0.02em]">
        Bivium
      </span>
    </Link>
  );
}
