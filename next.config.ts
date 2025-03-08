// next.config.ts
import type { NextConfig } from 'next'
 
const nextConfig: NextConfig = {
  output: 'export', // Outputs a Single-Page Application (SPA)
  distDir: 'build', // Changes the build output directory to `build`
  basePath: process.env.NEXT_PUBLIC_BASE_PATH, // 環境変数からbasePathを取得
  assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH // アセットプレフィックス追加
}
 
export default nextConfig