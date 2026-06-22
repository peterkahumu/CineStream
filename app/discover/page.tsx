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
  const apiParams: Record<string, string | number | boolean> = {
    sort_by: searchParams.sort || 'popularity.desc',
    page: 1,
    'vote_count.gte': 10,
  }

  if (searchParams.genre)    apiParams['with_genres']            = searchParams.genre
  if (searchParams.country)  apiParams['with_origin_country']    = searchParams.country
  if (searchParams.language) apiParams['with_original_language'] = searchParams.language
  if (searchParams.minRating) apiParams['vote_average.gte']      = searchParams.minRating
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

        <FilterBar
          movieGenres={movieGenresRes.genres}
          tvGenres={tvGenresRes.genres}
          countries={countries}
        />

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
