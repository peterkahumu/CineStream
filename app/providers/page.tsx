import { getProviderContent } from '@/lib/tmdb'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import ProvidersExplorer from './ProvidersExplorer'
import LoadingSpinner from '@/components/LoadingSpinner'

export const metadata: Metadata = {
  title: 'Streaming Providers',
  description: 'Browse movies and TV shows from Netflix, Prime Video, Disney+ and more — all in one place.',
}

export const revalidate = 3600

export default async function ProvidersPage() {
  // SSR-prefetch all three providers (both movies + TV) in parallel
  const [
    netflixMovie, netflixTV,
    primeMovie, primeTV,
    disneyMovie, disneyTV,
  ] = await Promise.allSettled([
    getProviderContent(8, 'movie'),
    getProviderContent(8, 'tv'),
    getProviderContent(9, 'movie'),
    getProviderContent(9, 'tv'),
    getProviderContent(337, 'movie'),
    getProviderContent(337, 'tv'),
  ])

  const ok = <T,>(r: PromiseSettledResult<{ results: T[]; total_pages: number; page: number; total_results: number }>) =>
    r.status === 'fulfilled' ? r.value : { results: [], total_pages: 0, page: 1, total_results: 0 }

  const initialData = {
    8:   { movie: ok(netflixMovie), tv: ok(netflixTV)  },
    9:   { movie: ok(primeMovie),   tv: ok(primeTV)    },
    337: { movie: ok(disneyMovie),  tv: ok(disneyTV)   },
  }

  return (
    <main className="page-content">
      <div className="page-container">
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', marginBottom: 4 }}>
            📺 Streaming Providers
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Browse the latest from your favourite platforms — all in one place
          </p>
        </div>

        <Suspense fallback={
          <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-2xl)' }}>
            <LoadingSpinner size="lg" />
          </div>
        }>
          <ProvidersExplorer initialData={initialData} />
        </Suspense>
      </div>
    </main>
  )
}
