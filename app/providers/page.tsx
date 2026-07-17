import { Suspense } from 'react'
import FilterBar from '@/components/FilterBar'
import { getMovieGenres, getTVGenres, discover } from '@/lib/tmdb'
import type { Metadata } from 'next'
import DiscoveryFeed from '@/components/DiscoveryFeed'
import ProviderTabs from '@/components/ProviderTabs'
import styles from '@/components/PageHeader.module.css'

export const metadata: Metadata = {
  title: 'Streaming Providers',
  description: 'Browse movies and TV shows from Netflix, Prime Video, Disney+ and more — all in one place.',
}

export const revalidate = 3600

export default async function ProvidersPage(props: {
  searchParams: Promise<Record<string, string>>
}) {
  const searchParams = await props.searchParams

  const [movieGenresRes, tvGenresRes] = await Promise.all([
    getMovieGenres(),
    getTVGenres()
  ])
  
  const rawMedia = searchParams.media
  const media = (rawMedia === 'movie' ? 'movie' : rawMedia === 'tv' ? 'tv' : 'all') as 'all' | 'movie' | 'tv'

  const providerId = searchParams.with_watch_providers || '8' // Default Netflix

  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  const gteDate = sixMonthsAgo.toISOString().split('T')[0]

  const baseParams = {
    sort_by: 'popularity.desc',
    with_original_language: 'en',
    with_watch_providers: providerId,
    watch_region: searchParams.watch_region || 'US',
    'primary_release_date.gte': gteDate,
    'first_air_date.gte': gteDate,
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
            📺 Streaming Providers
          </h1>
          <p className={styles.subtitle}>
            Browse the latest from your favourite platforms — all in one place
          </p>
        </div>

        <Suspense fallback={<div className={styles.fallback} />}>
          <ProviderTabs />
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
