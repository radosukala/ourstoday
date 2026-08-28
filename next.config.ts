import type { NextConfig } from "next";

/**
 * Security headers for OURS TODAY.
 * CSP note: unlike the static Day 1 page (connect-src 'none'), the working
 * application needs 'self' connections; no third-party origins are allowed.
 * 'unsafe-inline' scripts are required by the React flight payload; this is
 * recorded as a known limitation in the build receipt.
 */
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'none'",
      // React's development overlay reconstructs call stacks with eval(). Keep
      // that allowance local to development; production never receives it.
      "script-src 'self' 'unsafe-inline'" +
        (process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""),
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self'",
      "connect-src 'self'",
      "base-uri 'none'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
    ].join("; "),
  },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  ...(process.env.APP_ENV === "production"
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]
    : []),
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Governing documents must exist in server bundles (output tracing).
  outputFileTracingIncludes: {
    "/source/[...document]": ["./docs/**/*.md"],
    // Edition card fonts are committed files read at render time; trace them
    // into the two image-producing routes.
    "/api/v1/edition/card": ["./src/edition/fonts/*.ttf", "./src/edition/fonts/*.woff"],
    "/today/opengraph-image": ["./src/edition/fonts/*.ttf", "./src/edition/fonts/*.woff"],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // Never cache relay or confirmation pages in shared caches.
        source: "/r/:token",
        headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }],
      },
      {
        // Share previews are refetched by every scraper that sees the link.
        // Next serves public/ with max-age=0 by default, so each one pulls the
        // whole image again. The content only changes when we replace it.
        source: "/og.png",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, s-maxage=604800, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
