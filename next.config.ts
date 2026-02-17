import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // Disable cache components to allow dynamic test pages
  // Can re-enable once test-db is removed or made static
  cacheComponents: false,
  // Exclude native Rust binding from webpack bundling (runs on Node.js serverless only)
  serverExternalPackages: ["@open-spaced-repetition/binding"],
};

export default withNextIntl(nextConfig);
