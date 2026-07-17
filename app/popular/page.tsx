import { Suspense } from 'react'
import FilterBar from '@/components/FilterBar'
import { getMovieGenres, getTVGenres, discover } from '@/lib/tmdb'
import type { Metadata } from 'next'
import DiscoveryFeed from '@/components/DiscoveryFeed'
import styles from '@/components/PageHeader.module.css'

export const metadata: Metadata = {
  title: 'Popular',
  description: 'Browse the most popular movies and TV shows right now.',
}

export const revalidate = 900

export default async function PopularPage(props: {
  searchParams: Promise<Record<string, string>>
}) {
  const searchParams = await props.searchParams

  const [movieGenresRes, tvGenresRes] = await Promise.all([
    getMovieGenres(),
    getTVGenres()
  ])
  
  const rawMedia = searchParams.media
  const media = (rawMedia === 'movie' ? 'movie' : rawMedia === 'tv' ? 'tv' : 'all') as 'all' | 'movie' | 'tv'

  const baseParams = {
    sort_by: 'popularity.desc',
    with_original_language: 'en',
    'vote_count.gte': 50,
  }

  let initialItems: any[] = []
  let totalPages = 1
  let initialMovieItems: any[] = []
  let initialTvItems: any[] = []
  let movieTotalPages = 1
  let tvTotalPages = 1

  if (media === 'all') {
    const [movieData, tvData] = await Promise.all([
      discover({ media: 'movie', ...baseParams } as any),
      discover({ media: 'tv', ...baseParams } as any),
    ])
    initialMovieItems = movieData.results
    initialTvItems = tvData.results
    movieTotalPages = movieData.total_pages
    tvTotalPages = tvData.total_pages
  } else {
    const data = await discover({ media, ...baseParams } as any)
    initialItems = data.results
    totalPages = data.total_pages
  }

  return (
    <main className="page-content">
      <div className="page-container">
        <div className={styles.header}>
          <h1 className={styles.title}>
            {media === 'all' ? '🌐 Popular — All' : media === 'movie' ? '🎞️ Popular Movies' : '📺 Popular TV Shows'}
          </h1>
          <p className={styles.subtitle}>
            What everyone is watching right now
          </p>
        </div>

        <Suspense fallback={<div className={styles.fallback} />}>
          <FilterBar
            movieGenres={movieGenresRes.genres}
            tvGenres={tvGenresRes.genres}
            />
        </Suspense>

        <DiscoveryFeed
          key={JSON.stringify(searchParams)}
          media={media}
          searchParams={searchParams}
          baseParams={baseParams}
          initialItems={initialItems}
          totalPages={totalPages}
          initialMovieItems={initialMovieItems}
          initialTvItems={initialTvItems}
          movieTotalPages={movieTotalPages}
          tvTotalPages={tvTotalPages}
        />
      </div>
    </main>
  )
}
