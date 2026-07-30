import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  serverExternalPackages: ["pdfkit", "moment-hijri", "moment"],
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  env: {
    // Expose R2 public URL config to client components for URL normalization
    NEXT_PUBLIC_R2_PUBLIC_URL: process.env.R2_PUBLIC_URL ?? '',
    NEXT_PUBLIC_R2_LEGACY_PUBLIC_URLS: process.env.R2_LEGACY_PUBLIC_URLS ?? '',
  },
};

export default nextConfig;
