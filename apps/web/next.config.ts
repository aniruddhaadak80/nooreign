import type { NextConfig } from "next";

/**
 * `output: "standalone"` is opt-in rather than default.
 *
 * Next traces the server bundle by copying `node_modules` entries as symlinks, and
 * Windows refuses to create symlinks without Developer Mode or an elevated shell —
 * so enabling it unconditionally makes `next build` fail on the platform half this
 * project is developed on. The Docker image sets `NOOREIGN_STANDALONE=1`, where the
 * symlink step is legal and the slim runtime is worth having.
 */
const standalone = process.env.NOOREIGN_STANDALONE === "1" ? ("standalone" as const) : undefined;

const nextConfig: NextConfig = {
  ...(standalone ? { output: standalone } : {}),
  reactStrictMode: true,
  poweredByHeader: false,
  // The workspace packages ship raw TypeScript source, so Next compiles them with the app.
  transpilePackages: ["@repo/core", "@repo/i18n", "@repo/sdk", "@repo/seed", "@repo/ui"],
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "d3-scale"],
  },
  eslint: {
    dirs: ["src"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

export default nextConfig;
