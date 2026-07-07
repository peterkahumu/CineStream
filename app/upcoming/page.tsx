import { getUpcomingMovies, getUpcomingTV } from '@/lib/tmdb'
import type { Metadata } from 'next'
import UpcomingClient from './UpcomingClient'

export const metadata: Metadata = {
  title: 'Coming Soon',
  description: 'Movies and TV shows arriving in the next 3 months.',
}

export const revalidate = 3600 // 1 hour

export default async function UpcomingPage(props: {
  searchParams: Promise<Record<string, string>>
}) {
  const searchParams = await props.searchParams
  const media = (searchParams.media === 'tv' ? 'tv' : 'movie') as 'movie' | 'tv'

  const data = await (media === 'movie' ? getUpcomingMovies() : getUpcomingTV())

  return (
    <main className="page-content">
      <div className="page-container">
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', marginBottom: 4 }}>
            🍿 Coming Soon
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {media === 'movie' ? 'Movies' : 'TV shows'} releasing in the next 3 months
          </p>
        </div>

        <UpcomingClient
          key={media}
          initialItems={data.results}
          totalPages={data.total_pages}
          media={media}
        />
      </div>
    </main>
  )
}
