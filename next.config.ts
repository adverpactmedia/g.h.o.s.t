import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  serverExternalPackages: ["openai"],
  experimental: { serverActions: { bodySizeLimit: "2mb" } },
  poweredByHeader: false
};
export default nextConfig;
