import { getTopRated } from '@/lib/tmdb'
import type { Metadata } from 'next'
import TopRatedClient from './TopRatedClient'

export const metadata: Metadata = {
  title: 'Top Rated',
  description: 'The highest rated movies and TV shows of all time.',
}

export const revalidate = 3600

export default async function TopRatedPage(props: {
  searchParams: Promise<Record<string, string>>
}) {
  const searchParams = await props.searchParams
  const rawMedia = searchParams.media
  const media = (rawMedia === 'movie' ? 'movie' : rawMedia === 'tv' ? 'tv' : 'all') as 'all' | 'movie' | 'tv'

  if (media === 'all') {
    const [movieData, tvData] = await Promise.all([
      getTopRated('movie'),
      getTopRated('tv'),
    ])

    return (
      <main className="page-content">
        <div className="page-container">
          <div style={{ marginBottom: 'var(--space-xl)' }}>
            <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', marginBottom: 4 }}>
              🌐 Top Rated — All
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              The all-time best rated movies and TV shows
            </p>
          </div>

          <TopRatedClient
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

  const data = await getTopRated(media)

  return (
    <main className="page-content">
      <div className="page-container">
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', marginBottom: 4 }}>
            {media === 'movie' ? '⭐ Top Rated Movies' : '🏆 Top Rated TV Shows'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            The all-time best rated {media === 'movie' ? 'movies' : 'TV shows'}
          </p>
        </div>

        <TopRatedClient
          key={media}
          initialItems={data.results}
          totalPages={data.total_pages}
          media={media}
        />
      </div>
    </main>
  )
}
