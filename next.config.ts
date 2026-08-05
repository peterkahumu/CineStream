import type { NextConfig } from 'next'
import withPWA from '@ducanh2912/next-pwa'
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare'

const nextConfig: NextConfig = {

  output: "standalone",
  logging: {
    fetches: {
      fullUrl: false
    }
  },
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

// Lets `next dev` (not just `wrangler dev`) resolve Cloudflare bindings
// (e.g. the Hyperdrive binding in lib/db) via getCloudflareContext(). Gated to
// dev only — calling this during `next build` fails since there's no local
// Hyperdrive connection string to emulate at build time.
if (process.env.NODE_ENV === 'development') {
  initOpenNextCloudflareForDev()
}
