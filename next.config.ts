import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "ALLOW-FROM https://whop.com",
          },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self' https://whop.com https://*.whop.com;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
