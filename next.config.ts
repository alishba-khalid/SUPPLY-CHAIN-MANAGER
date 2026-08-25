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
};

export default nextConfig;
