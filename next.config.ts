import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable cache components to allow dynamic test pages
  // Can re-enable once test-db is removed or made static
  cacheComponents: false,
};

export default nextConfig;
