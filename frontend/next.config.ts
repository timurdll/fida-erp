import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Минимальный production-образ для Docker: .next/standalone c server.js + только нужные зависимости.
  output: "standalone",
};

export default nextConfig;
