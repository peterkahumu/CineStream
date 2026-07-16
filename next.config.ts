import type { NextConfig } from 'next'
import withPWA from '@ducanh2912/next-pwa'

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        pathname: '/t/p/**',
      },
    ],
  },
  // Optional: Disable PWA in development if you're having issues
  // devIndicators: process.env.NODE_ENV === 'development',
}

const withPWAConfig = withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  extendDefaultRuntimeCaching: true,
  publicExcludes: [
    '!noprecache/**/*',
    '!_headers',
    '!_routes.json',
  ],
  fallbacks: {
    document: '/~offline',
  },
  workboxOptions: {
    exclude: [
      /_headers$/,
      /_routes\.json$/,
      /_vercel.*/,
    ],
    runtimeCaching: [
      {
        urlPattern: /^\/_vercel\/.*/,
        handler: 'NetworkOnly',
      },
      {
        urlPattern: /^https:\/\/static\.cloudflareinsights\.com\/.*/,
        handler: 'NetworkOnly',
      },
      {
        urlPattern: /^https?:\/\/image\.tmdb\.org\/.*/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'tmdb-images',
          expiration: {
            maxEntries: 200,
            maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
          },
        },
      },
    ],
  },
})

export default withPWAConfig(nextConfig)
