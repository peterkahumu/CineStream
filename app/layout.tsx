import type { Metadata } from 'next'
import './globals.css'
import Navbar from '@/components/Navbar'

export const metadata: Metadata = {
  title: { default: 'CinemaPhora', template: '%s | CinemaPhora' },
  description: 'Discover, search and stream movies & TV shows — powered by TMDB.',
  keywords: ['movies', 'tv shows', 'streaming', 'discover', 'watch online'],
  icons: [
    {
      rel: 'icon',
      url: '/favicon.png',
      type: 'image/png',
    },
  ],
  openGraph: {
    type: 'website',
    title: 'CinemaPhora',
    description: 'Discover, search and stream movies & TV shows.',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <Navbar />
        {children}
      </body>
    </html>
  )
}
