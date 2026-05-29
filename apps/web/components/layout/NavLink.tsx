"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname?.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium transition-colors duration-base ease-out-expo",
        active
          ? "bg-bg-elevated text-accent"
          : "text-text-secondary hover:text-text-primary hover:bg-bg-elevated",
      )}
      aria-current={active ? "page" : undefined}
    >
      {children}
    </Link>
  );
}
