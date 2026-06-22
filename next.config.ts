import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        pathname: '/t/p/**',
      },
    ],
  },
  env: {
    STREAMING_PROVIDER: process.env.STREAMING_PROVIDER,
  },
  async headers() {
    return [
      {
        source: '/watch/:path*',
        headers: [
          {
            key: 'Permissions-Policy',
            value: 'fullscreen=*, autoplay=*, picture-in-picture=*',
          },
        ],
      },
    ]
  },
}

export default nextConfig
