import { Suspense } from 'react'
import FilterBar from '@/components/FilterBar'
import { getNowPlaying, getOnAir, getMovieGenres, getTVGenres, getCountries } from '@/lib/tmdb'
import type { Metadata } from 'next'
import DiscoveryFeed from '@/components/DiscoveryFeed'
import styles from '@/components/PageHeader.module.css'

export const metadata: Metadata = {
  title: 'Now Playing',
  description: 'Movies currently in theatres and TV shows currently on air.',
}

export const revalidate = 900

export default async function NowPlayingPage(props: {
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

  const endpointTemplate = { movie: '/api/tmdb/movie/now_playing', tv: '/api/tmdb/tv/on_the_air' }
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
      getNowPlaying(),
      getOnAir(),
    ])
    initialMovieItems = movieData.results
    initialTvItems = tvData.results
    movieTotalPages = movieData.total_pages
    tvTotalPages = tvData.total_pages
  } else {
    const data = await (media === 'movie' ? getNowPlaying() : getOnAir())
    initialItems = data.results
    totalPages = data.total_pages
  }

  return (
    <main className="page-content">
      <div className="page-container">
        <div className={styles.header}>
          <h1 className={styles.title}>
            {media === 'all' ? '🌐 Now Playing — All' : media === 'movie' ? '🎬 Now Playing' : '📡 Currently On Air'}
          </h1>
          <p className={styles.subtitle}>
            Movies in theatres and TV shows currently on air
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
