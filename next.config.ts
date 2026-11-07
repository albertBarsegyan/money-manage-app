import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    useTypeScriptCli: false,
  },
  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;
