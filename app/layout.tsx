import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Suspense } from 'react'
import Navbar from '@/components/Navbar'
import MobileHeader from '@/components/MobileHeader'
import Footer from '@/components/Footer'
import MobileNav from '@/components/MobileNav'
import CapacitorInit from '@/components/CapacitorInit'
import TermsAgreementModal from '@/components/TermsAgreementModal'
import { SettingsProvider } from '@/components/SettingsProvider'

export const viewport: Viewport = {
  themeColor: '#0f172a',
  viewportFit: 'cover',
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
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'CinemaPhora',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* No-FOUC: synchronously sets data-theme before first paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function(){
  try {
    var theme = (document.cookie.split(';').find(function(c){return c.trim().startsWith('cp_theme=')}) || '').split('=')[1];
    if(theme) theme = decodeURIComponent(theme.trim());
    if(!theme || theme === 'system') {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.dataset.theme = theme;
    var rm = (document.cookie.split(';').find(function(c){return c.trim().startsWith('cp_reduceMotion=')}) || '').split('=')[1];
    if(rm === 'true') document.documentElement.dataset.reduceMotion = 'true';
    var ds = (document.cookie.split(';').find(function(c){return c.trim().startsWith('cp_dataSaver=')}) || '').split('=')[1];
    if(ds === 'true') document.documentElement.dataset.dataSaver = 'true';
    var layout = (document.cookie.split(';').find(function(c){return c.trim().startsWith('cp_defaultLayout=')}) || '').split('=')[1];
    if(layout) document.documentElement.dataset.layout = decodeURIComponent(layout.trim());
  } catch(e) {}
})();
`,
          }}
        />
      </head>
      <body>
        <SettingsProvider>
          <CapacitorInit />
          <Navbar />
          <Suspense fallback={<header style={{ height: 'var(--mobile-header-height)' }} />}>
            <MobileHeader />
          </Suspense>
          <div className="site-main">{children}</div>
          <Footer />
          <MobileNav />
          <TermsAgreementModal />
        </SettingsProvider>
      </body>
    </html>
  )
}
