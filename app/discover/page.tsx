import { Suspense } from 'react'
import FilterBar from '@/components/FilterBar'
import { discover, getMovieGenres, getTVGenres, getCountries } from '@/lib/tmdb'
import styles from '@/components/PageHeader.module.css'
import DiscoveryFeed from '@/components/DiscoveryFeed'

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

  const media = searchParams.media || 'all'
  const isUpcoming = searchParams['primary_release_date.gte'] || searchParams['first_air_date.gte']

  const apiParams: Record<string, string | number | boolean> = {
    sort_by: searchParams.sort || 'popularity.desc',
    page: 1,
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
  if (searchParams['primary_release_date.gte']) apiParams['primary_release_date.gte'] = searchParams['primary_release_date.gte']
  if (searchParams['primary_release_date.lte']) apiParams['primary_release_date.lte'] = searchParams['primary_release_date.lte']
  if (searchParams['first_air_date.gte'])       apiParams['first_air_date.gte']       = searchParams['first_air_date.gte']
  if (searchParams['first_air_date.lte'])       apiParams['first_air_date.lte']       = searchParams['first_air_date.lte']

  let initialItems: any[] = []
  let totalPages = 1
  let initialMovieItems: any[] = []
  let initialTvItems: any[] = []
  let movieTotalPages = 1
  let tvTotalPages = 1

  if (media === 'all') {
    const [movieData, tvData] = await Promise.all([
      discover({ media: 'movie', ...apiParams, ...(searchParams.year && { primary_release_year: searchParams.year }) } as any),
      discover({ media: 'tv', ...apiParams, ...(searchParams.year && { first_air_date_year: searchParams.year }) } as any),
    ])
    initialMovieItems = movieData.results
    initialTvItems = tvData.results
    movieTotalPages = movieData.total_pages
    tvTotalPages = tvData.total_pages
  } else {
    if (searchParams.year) {
      if (media === 'movie') apiParams['primary_release_year'] = searchParams.year
      else                   apiParams['first_air_date_year']  = searchParams.year
    }
    const data = await discover({ media, ...apiParams } as any)
    initialItems = data.results
    totalPages = data.total_pages
  }

  // key forces DiscoverClient to remount when filters change — no useEffect sync needed
  const clientKey = JSON.stringify(searchParams)

  return (
    <main className="page-content">
      <div className="page-container">
        <div className={styles.header}>
          <h1 className={styles.title}>Discover</h1>
          <p className={styles.subtitle}>
            Browse {media === 'all' ? 'movies and TV shows' : media === 'movie' ? 'movies' : 'TV shows'} by genre, country, year and more
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
          key={clientKey}
          initialItems={initialItems}
          totalPages={totalPages}
          searchParams={searchParams}
          media={media as 'all' | 'movie' | 'tv'}
          initialMovieItems={initialMovieItems}
          initialTvItems={initialTvItems}
          movieTotalPages={movieTotalPages}
          tvTotalPages={tvTotalPages}
        />
      </div>
    </main>
  )
}
