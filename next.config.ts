import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors https://whop.com https://*.whop.com;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
