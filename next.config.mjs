/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    // Category photography is served from the Unsplash CDN, already sized via
    // Imgix params in src/lib/images.ts, so Next's optimizer would be a second
    // resize of an image that is already right.
    unoptimized: true,
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
  experimental: {
    // Dedupes identical DB reads across a single React render pass.
    staleTimes: { dynamic: 30, static: 300 },
  },
};
export default nextConfig;
