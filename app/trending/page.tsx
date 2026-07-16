import { Suspense } from 'react'
import FilterBar from '@/components/FilterBar'
import { getTrending, getMovieGenres, getTVGenres, getCountries } from '@/lib/tmdb'
import type { Metadata } from 'next'
import DiscoveryFeed from '@/components/DiscoveryFeed'
import styles from '@/components/PageHeader.module.css'

export const metadata: Metadata = {
  title: 'Trending This Week',
  description: 'Browse what is trending globally this week in movies and TV shows.',
}

export const revalidate = 900 // 15 minutes

export default async function TrendingPage(props: {
  searchParams: Promise<Record<string, string>>
}) {
  const searchParams = await props.searchParams

  const [movieGenresRes, tvGenresRes, countriesRes] = await Promise.all([
    getMovieGenres(),
    getTVGenres(),
    getCountries(),
  ])
  const countries = countriesRes.sort((a, b) => a.english_name.localeCompare(b.english_name))

  const rawMedia = searchParams.media
  const media = (rawMedia === 'movie' ? 'movie' : rawMedia === 'tv' ? 'tv' : 'all') as 'all' | 'movie' | 'tv'

  const endpointTemplate = '/api/tmdb/trending/{media}/week'
  const baseParams = {
    with_original_language: 'en',
  }

  let initialItems: any[] = []
  let totalPages = 1
  let initialMovieItems: any[] = []
  let initialTvItems: any[] = []
  let movieTotalPages = 1
  let tvTotalPages = 1

  if (media === 'all') {
    const [movieData, tvData] = await Promise.all([
      getTrending('movie', 'week'),
      getTrending('tv', 'week'),
    ])
    initialMovieItems = movieData.results
    initialTvItems = tvData.results
    movieTotalPages = movieData.total_pages
    tvTotalPages = tvData.total_pages
  } else {
    const data = await getTrending(media, 'week')
    initialItems = data.results
    totalPages = data.total_pages
  }

  return (
    <main className="page-content">
      <div className="page-container">
        <div className={styles.header}>
          <h1 className={styles.title}>
            🔥 Trending This Week
          </h1>
          <p className={styles.subtitle}>
            What the world is watching right now
          </p>
        </div>

        <Suspense fallback={<div className={styles.fallback} />}>
          <FilterBar
            movieGenres={movieGenresRes.genres}
            tvGenres={tvGenresRes.genres}
            countries={countries}
          />
        </Suspense>

        <DiscoveryFeed
          key={JSON.stringify(searchParams)}
          media={media}
          searchParams={searchParams}
          endpointTemplate={endpointTemplate}
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
