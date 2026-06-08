"use client";

import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "@privy-io/wagmi";
import { PrivyProvider } from "@privy-io/react-auth";
import { useEffect, useState } from "react";
import { arbitrum } from "wagmi/chains";
import { wagmiConfig } from "@/lib/wagmi";
import { Toaster } from "@/components/ui/Toaster";
import { EmbeddedWalletActivator } from "@/components/wallet/EmbeddedWalletActivator";

const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

export function Providers({ children }: { children: React.ReactNode }) {
  // QueryClient is stable across renders — instantiated once per Providers
  // lifetime via the useState initialiser.
  const [queryClient] = useState(() => new QueryClient());

  // PrivyProvider validates its app id at mount and breaks Next's static
  // prerender; WagmiProvider lives inside it, so the whole provider stack
  // can only mount on the client. We gate it on a single `mounted` flag
  // toggled in an effect — that's atomic (one React state transition) so
  // children either see the full provider tree or none, never an
  // intermediate state where WagmiProvider is absent but wagmi-using
  // components render. The previous `next/dynamic({ ssr: false })` had
  // an async chunk-load window that produced exactly that intermediate
  // state under HMR, surfacing as `WagmiProviderNotFoundError`.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!privyAppId) {
    throw new Error(
      "NEXT_PUBLIC_PRIVY_APP_ID is not set. Add it to apps/web/.env.local and restart the dev server.",
    );
  }

  return (
    <ThemeProvider
      attribute="data-theme"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      {mounted ? (
        <PrivyProvider
          appId={privyAppId}
          config={{
            embeddedWallets: {
              ethereum: {
                createOnLogin: "all-users",
              },
            },
            loginMethods: ["email", "google", "wallet"],
            defaultChain: arbitrum,
            supportedChains: [arbitrum],
            appearance: {
              theme: "dark",
              accentColor: "#0176f8",
              logo: "/icon.svg",
            },
          }}
        >
          <QueryClientProvider client={queryClient}>
            <WagmiProvider config={wagmiConfig}>
              <EmbeddedWalletActivator />
              {children}
              <Toaster />
            </WagmiProvider>
          </QueryClientProvider>
        </PrivyProvider>
      ) : null}
    </ThemeProvider>
  );
}
