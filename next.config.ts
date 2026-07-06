import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: ['localhost:3000', '192.168.100.*', '192.168.50.34', '192.168.50.*', '*.netlify.app', 'netlify.app'],
};

export default nextConfig;
