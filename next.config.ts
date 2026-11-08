import type { NextConfig } from "next";

const isCapacitorBuild = process.env.FINORA_BUILD_TARGET === "capacitor";

const nextConfig: NextConfig = {
  ...(isCapacitorBuild ? { output: "export" as const, trailingSlash: true } : {}),
  /* config options here */
  experimental: {
    useTypeScriptCli: false,
    useOffline: true,
  },
  cacheComponents: !isCapacitorBuild,
  partialPrefetching: !isCapacitorBuild,
  ...(!isCapacitorBuild && {
    async headers() {
      return [
        {
          source: "/sw.js",
          headers: [
            { key: "Content-Type", value: "application/javascript; charset=utf-8" },
            { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
            { key: "X-Content-Type-Options", value: "nosniff" },
          ],
        },
      ];
    },
  }),
};

export default nextConfig;
