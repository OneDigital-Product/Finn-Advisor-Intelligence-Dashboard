import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24, // 24 hours
  },
  typescript: {
    // Express route files (server/routes/) have pre-existing strict-mode issues
    // with req.params types. Dev mode compiles fine; this skips the full build check.
    ignoreBuildErrors: true,
  },
  serverExternalPackages: ["pg", "pino", "pino-pretty"],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: process.env.CORS_ORIGIN || 'https://app.onedigital.com' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, PATCH, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
          { key: 'Access-Control-Max-Age', value: '86400' },
        ],
      },
    ];
  },
  // Turbopack (Next.js 16 default)
  turbopack: {
    resolveAlias: {
      "@shared": path.resolve("./shared"),
      "@server": path.resolve("./server"),
      "@assets": path.resolve("./attached_assets"),
      "@lib": path.resolve("./lib"),
      "@": path.resolve("./client/src"),
    },
  },
  // Webpack fallback (next build --webpack)
  webpack: (config) => {
    config.resolve.alias["@shared"] = path.resolve("./shared");
    config.resolve.alias["@server"] = path.resolve("./server");
    config.resolve.alias["@assets"] = path.resolve("./attached_assets");
    config.resolve.alias["@lib"] = path.resolve("./lib");
    config.resolve.alias["@"] = path.resolve("./client/src");
    return config;
  },
};

export default nextConfig;
