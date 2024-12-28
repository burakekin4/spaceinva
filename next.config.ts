import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    appDir: true as any,
  },
  appDir: 'src/app' as any// Assuming you want to use src/app  
} as NextConfig

export default nextConfig