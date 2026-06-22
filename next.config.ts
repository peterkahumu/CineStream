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
}

export default nextConfig
