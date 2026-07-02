import { getPopular } from '@/lib/tmdb'
import type { Metadata } from 'next'
import PopularClient from './PopularClient'

export const metadata: Metadata = {
  title: 'Popular | CinemaPhora',
  description: 'Browse the most popular movies and TV shows right now.',
}

export const revalidate = 900

export default async function PopularPage(props: {
  searchParams: Promise<Record<string, string>>
}) {
  const searchParams = await props.searchParams
  const media = (searchParams.media === 'tv' ? 'tv' : 'movie') as 'movie' | 'tv'

  const data = await getPopular(media)

  return (
    <main className="page-content">
      <div className="page-container">
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', marginBottom: 4 }}>
            {media === 'movie' ? '🎞️ Popular Movies' : '📺 Popular TV Shows'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            What everyone is watching right now
          </p>
        </div>

        <PopularClient
          key={media}
          initialItems={data.results}
          totalPages={data.total_pages}
          media={media}
        />
      </div>
    </main>
  )
}
