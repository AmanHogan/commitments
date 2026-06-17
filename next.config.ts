import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a self-contained .next/standalone folder — used by the Dockerfile
  // to build a minimal production image (no node_modules in the final layer).
  output: 'standalone',
};

export default nextConfig;
