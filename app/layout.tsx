import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Suspense } from 'react'
import Navbar from '@/components/Navbar'
import MobileHeader from '@/components/MobileHeader'
import Footer from '@/components/Footer'
import MobileNav from '@/components/MobileNav'
import CapacitorInit from '@/components/CapacitorInit'
import TermsAgreementModal from '@/components/TermsAgreementModal'
import RouteProtector from '@/components/RouteProtector'

export const viewport: Viewport = {
  themeColor: '#0f172a',
}

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
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <RouteProtector>
          <CapacitorInit />
          <Navbar />
          <Suspense fallback={<header style={{ height: 'var(--mobile-header-height)' }} />}>
            <MobileHeader />
          </Suspense>
          <div className="site-main">{children}</div>
          <Footer />
          <MobileNav />
          <TermsAgreementModal />
        </RouteProtector>
      </body>
    </html>
  )
}
