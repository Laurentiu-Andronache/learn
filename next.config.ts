import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // Disable cache components to allow dynamic test pages
  // Can re-enable once test-db is removed or made static
  cacheComponents: false,
  // Exclude native Rust binding from webpack bundling (runs on Node.js serverless only)
  serverExternalPackages: ["@open-spaced-repetition/binding", "sharp", "lamejs"],
  experimental: {
    // Allow large file uploads (Anki .apkg files can be up to 50MB)
    proxyClientMaxBodySize: 50 * 1024 * 1024,
  },
};

export default withNextIntl(nextConfig);
