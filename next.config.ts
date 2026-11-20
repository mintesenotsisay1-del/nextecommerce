import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Product imagery lives in /public/img/products
    formats: ["image/webp"],
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
