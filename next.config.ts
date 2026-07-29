import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep Turbopack scoped to this checkout when a parent directory also has
  // a package lockfile. Vercel already builds from this same project root.
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
