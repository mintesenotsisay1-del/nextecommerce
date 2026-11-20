import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Product imagery lives in /public/img/products. Admin-managed hero and
    // product images may also point at remote https URLs.
    formats: ["image/webp"],
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
