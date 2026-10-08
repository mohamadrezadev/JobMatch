const { PHASE_DEVELOPMENT_SERVER } = require("next/constants");
const path = require("node:path");

/** @type {import('next').NextConfig} */
module.exports = (phase) => ({
  reactStrictMode: true,
  // Next's standalone packager creates pnpm symlinks, which Windows blocks
  // unless Developer Mode/elevated privileges are enabled. Container and
  // production Linux builds still emit the standalone artifact used by the
  // Dockerfile; local Windows builds verify the application without it.
  output: process.platform === "win32" ? undefined : "standalone",
  outputFileTracingRoot: path.join(__dirname, ".."),
  // Development and production builds must not write to the same cache.
  distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next",
  experimental: { proxyTimeout: 120000 },
  async rewrites() {
    const backend = process.env.API_INTERNAL_URL;
    return backend
      ? [
          {
            source: "/api/:path*",
            destination: `${backend.replace(/\/$/, "")}/api/:path*`,
          },
        ]
      : [];
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          { key: "Service-Worker-Allowed", value: "/" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
      {
        source: "/offline.html",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },
});
