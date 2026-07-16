import { Suspense } from 'react'
import FilterBar from '@/components/FilterBar'
import { discover, getMovieGenres, getTVGenres, getCountries } from '@/lib/tmdb'
import styles from './page.module.css'
import DiscoverClient from './DiscoverClient'

export const dynamic = 'force-dynamic'

export default async function DiscoverPage(props: {
  searchParams: Promise<Record<string, string>>
}) {
  const searchParams = await props.searchParams

  const [movieGenresRes, tvGenresRes, countriesRes] = await Promise.all([
    getMovieGenres(),
    getTVGenres(),
    getCountries(),
  ])

  const countries = countriesRes.sort((a, b) => a.english_name.localeCompare(b.english_name))

  const media = searchParams.media || 'movie'
  const isUpcoming = searchParams['primary_release_date.gte'] || searchParams['first_air_date.gte']

  const apiParams: Record<string, string | number | boolean> = {
    sort_by: searchParams.sort || 'popularity.desc',
    page: 1,
    // Don't filter by vote count for upcoming — unreleased titles have no votes yet
    ...(!isUpcoming && { 'vote_count.gte': 10 }),
  }

  if (searchParams.genre)    apiParams['with_genres']            = searchParams.genre
  if (searchParams.country)  apiParams['with_origin_country']    = searchParams.country
  if (searchParams.language) apiParams['with_original_language'] = searchParams.language
  if (searchParams.minRating) apiParams['vote_average.gte']      = searchParams.minRating
  if (searchParams.with_watch_providers) {
    apiParams['with_watch_providers'] = searchParams.with_watch_providers
    apiParams['watch_region'] = searchParams.watch_region || 'US'
  }
  // Date range filters (upcoming / provider deep-links)
  if (searchParams['primary_release_date.gte']) apiParams['primary_release_date.gte'] = searchParams['primary_release_date.gte']
  if (searchParams['primary_release_date.lte']) apiParams['primary_release_date.lte'] = searchParams['primary_release_date.lte']
  if (searchParams['first_air_date.gte'])       apiParams['first_air_date.gte']       = searchParams['first_air_date.gte']
  if (searchParams['first_air_date.lte'])       apiParams['first_air_date.lte']       = searchParams['first_air_date.lte']
  if (searchParams.year) {
    if (media === 'movie') apiParams['primary_release_year'] = searchParams.year
    else                   apiParams['first_air_date_year']  = searchParams.year
  }

  const data = await discover({ media, ...apiParams } as any)

  // key forces DiscoverClient to remount when filters change — no useEffect sync needed
  const clientKey = JSON.stringify(searchParams)

  return (
    <main className="page-content">
      <div className="page-container">
        <div className={styles.header}>
          <h1 className={styles.title}>Discover</h1>
          <p className={styles.subtitle}>
            Browse {media === 'movie' ? 'movies' : 'TV shows'} by genre, country, year and more
          </p>
        </div>

        <Suspense fallback={<div className={styles.filterBarSkeleton} />}>
          <FilterBar
            movieGenres={movieGenresRes.genres}
            tvGenres={tvGenresRes.genres}
            countries={countries}
          />
        </Suspense>

        <DiscoverClient
          key={clientKey}
          initialItems={data.results}
          totalPages={data.total_pages}
          searchParams={searchParams}
        />
      </div>
    </main>
  )
}
