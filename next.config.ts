import path from "node:path";
import type { NextConfig } from "next";

// Conservative security headers that don't interfere with Next's inline
// runtime scripts or the embedded YouTube trailer. `frame-ancestors` /
// X-Frame-Options stop the app being framed (clickjacking); HSTS is only
// honoured by browsers over HTTPS, so it's harmless in local dev.
const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // A stray lockfile higher up the filesystem made Next guess the wrong workspace root.
  turbopack: {
    root: path.resolve(__dirname),
  },
  // Images load straight from TMDB's and YouTube's own pre-sized CDNs via a
  // custom loader (lib/image-loader.ts), not through Next/Vercel image
  // optimization: that has a usage quota (Vercel returned 402
  // OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED once it ran out), and it's an
  // image proxy we'd otherwise have to keep patched. No remote host is
  // allowed for /_next/image, so it can't be used as a proxy either.
  images: {
    loader: "custom",
    loaderFile: "./lib/image-loader.ts",
  },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
