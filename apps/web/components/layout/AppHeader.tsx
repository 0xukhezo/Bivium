"use client";

import { useState } from "react";
import { Logo } from "./Logo";
import { NavLink } from "./NavLink";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { MobileDrawer, MobileMenuTrigger } from "./MobileDrawer";

export function AppHeader() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 w-full border-b border-border bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex h-[72px] max-w-screen-2xl items-center gap-6 px-6 lg:px-10">
          <Logo />
          <nav
            className="hidden items-center gap-1 md:flex"
            aria-label="Primary"
          >
            <NavLink href="/market">Market</NavLink>
            <NavLink href="/dashboard">Dashboard</NavLink>
          </nav>
          <div className="ml-auto hidden items-center gap-2 md:flex">
            <ThemeToggle />
            <ConnectButton />
          </div>
          <div className="ml-auto md:hidden">
            <MobileMenuTrigger
              onClick={() => setOpen(true)}
              open={open}
            />
          </div>
        </div>
      </header>
      <MobileDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}
