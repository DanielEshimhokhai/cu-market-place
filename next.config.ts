import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The repo lives in a OneDrive-synced folder, where file-change events are unreliable; a persisted
  // dev cache then serves stale Tailwind output after restarts. Rebuilding from scratch is cheap here.
  experimental: { turbopackFileSystemCacheForDev: false },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "olqhnihinowwkvdlobxs.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
};

export default nextConfig;
