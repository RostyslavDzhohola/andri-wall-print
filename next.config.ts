import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.ngrok-free.dev"],
  async headers() {
    return [
      {
        source: "/ar/:path*.usdz",
        headers: [
          {
            key: "Content-Type",
            value: "model/vnd.usdz+zip"
          }
        ]
      },
      {
        source: "/ar/:path*.glb",
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
