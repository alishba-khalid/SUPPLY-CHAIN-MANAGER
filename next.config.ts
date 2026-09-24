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
  // Default position (bottom-left) sits directly on top of the sidebar's
  // "Collapse" control, which is docked in that same corner. Moving the dev
  // indicator to the opposite corner is the supported fix — it renders
  // outside the app's own DOM tree, so no in-app z-index can separate them.
  devIndicators: {
    position: "bottom-right",
  },
  experimental: {
    serverActions: {
      // The smart importer is the only action that sends a large payload:
      // one chunk of at most 2,000 parsed rows (capped at ~1.5MB of JSON in
      // src/lib/importer/chunked-import.ts) per request; everything else is
      // small forms. Explicit rather than relying on Next's implicit default.
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
