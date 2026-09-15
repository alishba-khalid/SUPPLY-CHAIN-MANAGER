import type { NextConfig } from "next";

const OLD_DASHBOARD_PATHS = [
  "overview",
  "inventory",
  "procurement",
  "suppliers",
  "logistics",
  "warehouses",
  "analytics",
  "ai-manager",
  "profile",
  "settings",
];

const nextConfig: NextConfig = {
  async redirects() {
    return OLD_DASHBOARD_PATHS.map((path) => ({
      source: `/${path}`,
      destination: `/dashboard/${path}`,
      permanent: true,
    }));
  },
  experimental: {
    serverActions: {
      // The smart importer is the only action that sends a large payload
      // (up to 5,000 parsed rows as JSON); everything else is small forms.
      // Explicit rather than relying on Next's implicit default.
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
