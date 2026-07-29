import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.ngrok-free.dev"],
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "thewallprintpro.com" }],
        destination: "https://www.thewallprintpro.com/:path*",
        permanent: true
      }
    ];
  },
  async headers() {
    return [
      {
        source: "/api/ar/:path*.usdz",
        headers: [
          {
            key: "Content-Type",
            value: "model/vnd.usdz+zip"
          }
        ]
      },
      {
        source: "/api/ar/:path*.glb",
        headers: [
          {
            key: "Content-Type",
            value: "model/gltf-binary"
          }
        ]
      }
    ];
  },
  turbopack: {
    root: process.cwd()
  }
};

export default nextConfig;
