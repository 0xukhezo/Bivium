"use client";

import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "@privy-io/wagmi";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { arbitrum } from "wagmi/chains";
import { wagmiConfig } from "@/lib/wagmi";
import { Toaster } from "@/components/ui/Toaster";
import { EmbeddedWalletActivator } from "@/components/wallet/EmbeddedWalletActivator";

const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

// PrivyProvider validates the app id at mount, which breaks Next's static
// prerender. Lazy-load with ssr: false so the shell still SSRs.
const PrivyAuthProvider = dynamic(
  () =>
    import("@privy-io/react-auth").then((mod) => {
      const { PrivyProvider } = mod;
      function PrivyAuthProviderImpl({
        children,
      }: {
        children: React.ReactNode;
      }) {
        if (!privyAppId) {
          throw new Error(
            "NEXT_PUBLIC_PRIVY_APP_ID is not set. Add it to apps/web/.env.local and restart the dev server.",
          );
        }
        return (
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
            {children}
          </PrivyProvider>
        );
      }
      return PrivyAuthProviderImpl;
    }),
  { ssr: false },
);

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <ThemeProvider
      attribute="data-theme"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      <PrivyAuthProvider>
        <QueryClientProvider client={queryClient}>
          <WagmiProvider config={wagmiConfig}>
            <EmbeddedWalletActivator />
            {children}
            <Toaster />
          </WagmiProvider>
        </QueryClientProvider>
      </PrivyAuthProvider>
    </ThemeProvider>
  );
}
