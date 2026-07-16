import { Suspense } from 'react'
import FilterBar from '@/components/FilterBar'
import { getMovieGenres, getTVGenres, getCountries, discover } from '@/lib/tmdb'
import type { Metadata } from 'next'
import DiscoveryFeed from '@/components/DiscoveryFeed'
import styles from '@/components/PageHeader.module.css'

export const metadata: Metadata = {
  title: 'Top Rated',
  description: 'The highest rated movies and TV shows of all time.',
}

export const revalidate = 3600

export default async function TopRatedPage(props: {
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

  const baseParams = {
    sort_by: 'vote_average.desc',
    with_original_language: 'en',
    'vote_count.gte': 200,
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
            {media === 'all' ? '🌐 Top Rated — All' : media === 'movie' ? '⭐ Top Rated Movies' : '🏆 Top Rated TV Shows'}
          </h1>
          <p className={styles.subtitle}>
            The all-time best rated movies and TV shows
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
