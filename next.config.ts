import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "192.168.0.231"],
  output: process.env.DOCKER_BUILD === "1" ? "standalone" : undefined,
  experimental: {
    useTypeScriptCli: false,
  },
};

export default nextConfig;
