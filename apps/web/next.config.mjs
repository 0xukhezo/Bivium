/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["lucide-react", "@nivo/sankey"],
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      "@react-native-async-storage/async-storage": false,
      // Privy bundles optional Solana / Farcaster integrations behind dynamic
      // imports; we're EVM-only so we stub them out at the resolver level.
      "@farcaster/mini-app-solana": false,
      "@solana/web3.js": false,
    };
    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  },
};

export default nextConfig;
