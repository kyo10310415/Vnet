import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Renderデプロイ時はstandaloneではなく通常モードを使用
  serverExternalPackages: ['@prisma/client', '@prisma/adapter-pg', 'pg'],
};

export default nextConfig;
