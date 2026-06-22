import type { NextConfig } from 'next'

// Streaming provider origins that need fullscreen delegation
const streamingOrigins = [
  'https://vidlink.pro',
  'https://multiembed.mov',
  'https://vidsrc-embed.su',
]

const permissionsPolicy = [
  `fullscreen=(self ${streamingOrigins.map((o) => `"${o}"`).join(' ')})`,
  `autoplay=(self ${streamingOrigins.map((o) => `"${o}"`).join(' ')})`,
  `picture-in-picture=(self ${streamingOrigins.map((o) => `"${o}"`).join(' ')})`,
].join(', ')

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
        // Apply to every page so the browser's frame-permission chain is never broken
        source: '/:path*',
        headers: [
          {
            key: 'Permissions-Policy',
            value: permissionsPolicy,
          },
        ],
      },
    ]
  },
}

export default nextConfig
