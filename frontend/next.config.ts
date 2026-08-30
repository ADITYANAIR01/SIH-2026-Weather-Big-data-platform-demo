import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // OPS (SRE): /public/data/*.geojson are build-time static assets (~1.2 MB total)
  // that never change at runtime. Default Next serving sends Cache-Control: max-age=0
  // (revalidate every page load). Cache them for 1h to avoid repeated 214 KB + 962 KB
  // revalidation round-trips during a demo; Next ETag still allows immediate invalidation
  // after expiry if the boundary files are regenerated.
  async headers() {
    return [
      {
        source: "/data/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=3600" }],
      },
    ];
  },
};

export default nextConfig;