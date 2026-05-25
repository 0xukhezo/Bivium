import { Logo } from "./Logo";
import { NavLink } from "./NavLink";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ConnectButton } from "@/components/wallet/ConnectButton";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-border bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-[72px] max-w-screen-2xl items-center gap-6 px-6 lg:px-10">
        <Logo />
        <nav className="flex items-center gap-1" aria-label="Primary">
          <NavLink href="/market">Market</NavLink>
          <NavLink href="/dashboard">Dashboard</NavLink>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}
