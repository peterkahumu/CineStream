import { getTrending, MediaItem, TMDBPage } from '@/lib/tmdb'
import type { Metadata } from 'next'
import TrendingClient from './TrendingClient'

export const metadata: Metadata = {
  title: 'Trending This Week | CinemaPhora',
  description: 'Browse what is trending globally this week in movies and TV shows.',
}

export const revalidate = 900 // 15 minutes

export default async function TrendingPage(props: {
  searchParams: Promise<Record<string, string>>
}) {
  const searchParams = await props.searchParams
  const media = (searchParams.media === 'tv' ? 'tv' : 'all') as 'all' | 'movie' | 'tv'

  const data = await getTrending(media, 'week')

  return (
    <main className="page-content">
      <div className="page-container">
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', marginBottom: 4 }}>
            🔥 Trending This Week
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            What the world is watching right now
          </p>
        </div>

        <TrendingClient
          key={media}
          initialItems={data.results}
          totalPages={data.total_pages}
          media={media}
        />
      </div>
    </main>
  )
}
