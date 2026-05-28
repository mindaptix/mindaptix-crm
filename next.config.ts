import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tree-shake heavy packages — reduces bundle size
  experimental: {
    optimizePackageImports: ["recharts", "lucide-react", "@radix-ui/react-icons"],
  },

  // Faster image loading with modern formats
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },

  // HTTP compression
  compress: true,

  // Disable X-Powered-By header (small security + perf win)
  poweredByHeader: false,

  webpack(config, { dev }) {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
