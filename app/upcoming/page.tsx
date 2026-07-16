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
  const rawMedia = searchParams.media
  const media = (rawMedia === 'tv' ? 'tv' : rawMedia === 'all' ? 'all' : 'movie') as 'all' | 'movie' | 'tv'

  if (media === 'all') {
    const [movieData, tvData] = await Promise.all([
      getUpcomingMovies(),
      getUpcomingTV(),
    ])

    return (
      <main className="page-content">
        <div className="page-container">
          <div style={{ marginBottom: 'var(--space-xl)' }}>
            <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', marginBottom: 4 }}>
              🌐 Coming Soon — All
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Movies and TV shows releasing in the next 3 months
            </p>
          </div>

          <UpcomingClient
            key="all"
            media="all"
            initialItems={[]}
            totalPages={1}
            initialMovieItems={movieData.results}
            initialTvItems={tvData.results}
            movieTotalPages={movieData.total_pages}
            tvTotalPages={tvData.total_pages}
          />
        </div>
      </main>
    )
  }

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
