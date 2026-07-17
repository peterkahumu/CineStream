import { Suspense } from 'react'
import FilterBar from '@/components/FilterBar'
import { getUpcomingMovies, getUpcomingTV, getMovieGenres, getTVGenres } from '@/lib/tmdb'
import type { Metadata } from 'next'
import DiscoveryFeed from '@/components/DiscoveryFeed'
import styles from '@/components/PageHeader.module.css'

export const metadata: Metadata = {
  title: 'Coming Soon',
  description: 'Movies and TV shows arriving in the next 3 months.',
}

export const revalidate = 3600 // 1 hour

export default async function UpcomingPage(props: {
  searchParams: Promise<Record<string, string>>
}) {
  const searchParams = await props.searchParams

  const [movieGenresRes, tvGenresRes] = await Promise.all([
    getMovieGenres(),
    getTVGenres()
  ])
  
  const rawMedia = searchParams.media
  const media = (rawMedia === 'movie' ? 'movie' : rawMedia === 'tv' ? 'tv' : 'all') as 'all' | 'movie' | 'tv'

  const today = new Date()
  const future = new Date()
  future.setMonth(future.getMonth() + 3)
  const todayStr = today.toISOString().split('T')[0]
  const futureStr = future.toISOString().split('T')[0]

  const baseParams = {
    sort_by: 'popularity.desc',
    with_original_language: 'en',
    'primary_release_date.gte': todayStr,
    'primary_release_date.lte': futureStr,
    'first_air_date.gte': todayStr,
    'first_air_date.lte': futureStr,
  }

  let initialItems: any[] = []
  let totalPages = 1
  let initialMovieItems: any[] = []
  let initialTvItems: any[] = []
  let movieTotalPages = 1
  let tvTotalPages = 1

  if (media === 'all') {
    const [movieData, tvData] = await Promise.all([
      getUpcomingMovies(),
      getUpcomingTV(),
    ])
    initialMovieItems = movieData.results
    initialTvItems = tvData.results
    movieTotalPages = movieData.total_pages
    tvTotalPages = tvData.total_pages
  } else {
    const data = await (media === 'movie' ? getUpcomingMovies() : getUpcomingTV())
    initialItems = data.results
    totalPages = data.total_pages
  }

  return (
    <main className="page-content">
      <div className="page-container">
        <div className={styles.header}>
          <h1 className={styles.title}>
            {media === 'all' ? '🌐 Coming Soon — All' : '🍿 Coming Soon'}
          </h1>
          <p className={styles.subtitle}>
            {media === 'all' ? 'Movies and TV shows' : media === 'movie' ? 'Movies' : 'TV shows'} releasing in the next 3 months
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
