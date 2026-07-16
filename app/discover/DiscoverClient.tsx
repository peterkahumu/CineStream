'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import MediaCard from '@/components/MediaCard'
import LoadingSpinner from '@/components/LoadingSpinner'
import { discover, MediaItem } from '@/lib/tmdb'
import styles from './page.module.css'

function createScrollObserver(
  sentinel: HTMLDivElement | null,
  onIntersect: () => void,
): (() => void) {
  if (!sentinel) return () => { }
  const observer = new IntersectionObserver(
    entries => { if (entries[0].isIntersecting) onIntersect() },
    { rootMargin: '300px' },
  )
  observer.observe(sentinel)
  return () => observer.disconnect()
}

function mergeInterleaved(movies: MediaItem[], tvShows: MediaItem[]): MediaItem[] {
  const result: MediaItem[] = []
  const seen = new Set<number>()
  const taggedMovies = movies.map(i => ({ ...i, media_type: 'movie' as const }))
  const taggedTv = tvShows.map(i => ({ ...i, media_type: 'tv' as const }))
  const maxLen = Math.max(taggedMovies.length, taggedTv.length)
  for (let i = 0; i < maxLen; i++) {
    if (i < taggedMovies.length && !seen.has(taggedMovies[i].id)) {
      result.push(taggedMovies[i])
      seen.add(taggedMovies[i].id)
    }
    if (i < taggedTv.length && !seen.has(taggedTv[i].id)) {
      result.push(taggedTv[i])
      seen.add(taggedTv[i].id)
    }
  }
  return result
}

interface Props {
  initialItems: MediaItem[]
  totalPages: number
  searchParams: Record<string, string>
  media: 'all' | 'movie' | 'tv'
  initialMovieItems?: MediaItem[]
  initialTvItems?: MediaItem[]
  movieTotalPages?: number
  tvTotalPages?: number
}

export default function DiscoverClient({
  initialItems,
  totalPages,
  searchParams,
  media,
  initialMovieItems = [],
  initialTvItems = [],
  movieTotalPages = 1,
  tvTotalPages = 1,
}: Props) {
  const [items, setItems] = useState<MediaItem[]>(initialItems)
  const [page, setPage] = useState(1)

  const [movieItems, setMovieItems] = useState<MediaItem[]>(initialMovieItems)
  const [tvItems, setTvItems] = useState<MediaItem[]>(initialTvItems)
  const [moviePage, setMoviePage] = useState(1)
  const [tvPage, setTvPage] = useState(1)

  const [loadingMore, setLoadingMore] = useState(false)
  const loadingRef = useRef(false)
  const [exhausted, setExhausted] = useState(
    media === 'all'
      ? moviePage >= movieTotalPages && tvPage >= tvTotalPages
      : page >= totalPages
  )
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Upcoming pages have a future date filter — skip vote_count guard for those
  const isUpcoming = !!(searchParams['primary_release_date.gte'] || searchParams['first_air_date.gte'])

  const loadMore = useCallback(async () => {
    if (loadingRef.current) return
    loadingRef.current = true
    setLoadingMore(true)

    try {
      const params: Record<string, string | number | boolean> = {
        sort_by: searchParams.sort || 'popularity.desc',
        ...(!isUpcoming && { 'vote_count.gte': 10 }),
      }
      if (searchParams.genre) params['with_genres'] = searchParams.genre
      if (searchParams.country) params['with_origin_country'] = searchParams.country
      if (searchParams.language) params['with_original_language'] = searchParams.language
      if (searchParams.minRating) params['vote_average.gte'] = searchParams.minRating
      if (searchParams.with_watch_providers) {
        params['with_watch_providers'] = searchParams.with_watch_providers
        params['watch_region'] = searchParams.watch_region || 'US'
      }
      if (searchParams['primary_release_date.gte']) params['primary_release_date.gte'] = searchParams['primary_release_date.gte']
      if (searchParams['primary_release_date.lte']) params['primary_release_date.lte'] = searchParams['primary_release_date.lte']
      if (searchParams['first_air_date.gte']) params['first_air_date.gte'] = searchParams['first_air_date.gte']
      if (searchParams['first_air_date.lte']) params['first_air_date.lte'] = searchParams['first_air_date.lte']

      if (media === 'all') {
        const nextMovie = moviePage + 1
        const nextTv = tvPage + 1
        const movieDone = nextMovie > movieTotalPages
        const tvDone = nextTv > tvTotalPages
        if (movieDone && tvDone) { setExhausted(true); return }

        const movieParams: Record<string, string | number | boolean> = { ...params, page: nextMovie }
        const tvParams: Record<string, string | number | boolean> = { ...params, page: nextTv }
        if (searchParams.year) {
          movieParams['primary_release_year'] = searchParams.year
          tvParams['first_air_date_year'] = searchParams.year
        }

        const [newMovies, newTv] = await Promise.all([
          !movieDone ? discover({ media: 'movie', ...movieParams } as any) : Promise.resolve(null),
          !tvDone ? discover({ media: 'tv', ...tvParams } as any) : Promise.resolve(null),
        ])

        if (newMovies) {
          setMovieItems(prev => {
            const existingIds = new Set(prev.map(item => item.id))
            const uniqueNew = newMovies.results.filter(item => !existingIds.has(item.id))
            return [...prev, ...uniqueNew]
          })
          setMoviePage(nextMovie)
        }
        if (newTv) {
          setTvItems(prev => {
            const existingIds = new Set(prev.map(item => item.id))
            const uniqueNew = newTv.results.filter(item => !existingIds.has(item.id))
            return [...prev, ...uniqueNew]
          })
          setTvPage(nextTv)
        }

        const newMovieDone = (newMovies ? nextMovie : moviePage) >= movieTotalPages
        const newTvDone = (newTv ? nextTv : tvPage) >= tvTotalPages
        if (newMovieDone && newTvDone) setExhausted(true)

      } else {
        const next = page + 1
        if (next > totalPages) { setExhausted(true); return }
        
        const typeParams: Record<string, string | number | boolean> = { ...params, page: next }
        if (searchParams.year) {
          if (media === 'movie') typeParams['primary_release_year'] = searchParams.year
          else typeParams['first_air_date_year'] = searchParams.year
        }

        const data = await discover({ media, ...typeParams } as any)
        setItems(prev => {
          const existingIds = new Set(prev.map(item => item.id))
          const uniqueNew = data.results.filter(item => !existingIds.has(item.id))
          return [...prev, ...uniqueNew]
        })
        setPage(next)
        if (next >= totalPages) setExhausted(true)
      }
    } catch (e) {
      console.error('Failed to load more', e)
    } finally {
      setLoadingMore(false)
      loadingRef.current = false
    }
  }, [page, media, moviePage, tvPage, totalPages, movieTotalPages, tvTotalPages, searchParams, isUpcoming])

  // Re-attach observer only when there is more to load
  useEffect(() => {
    if (exhausted) return
    return createScrollObserver(sentinelRef.current, loadMore)
  }, [loadMore, exhausted])

  const displayItems = media === 'all' ? mergeInterleaved(movieItems, tvItems) : items

  if (displayItems.length === 0) {
    return (
      <div className="empty-state">
        <div className="icon">🎬</div>
        <h3>No results found</h3>
        <p>Try adjusting or resetting your filters.</p>
      </div>
    )
  }

  return (
    <>
      <p className={styles.resultCount}>{displayItems.length} titles loaded</p>
      <div className="media-grid animate-fadeIn">
        {displayItems.map(item => (
          <MediaCard key={`${item.media_type ?? media}-${item.id}`} item={item} forcedType={media !== 'all' ? media : undefined} />
        ))}
      </div>

      {/* Sentinel — only in DOM while there is more to load; prevents footer flash */}
      {!exhausted && (
        <div ref={sentinelRef} className={styles.sentinel} aria-hidden="true" />
      )}

      {loadingMore && (
        <div className={styles.loadMoreWrap}>
          <LoadingSpinner size="md" />
        </div>
      )}

      {exhausted && displayItems.length > 0 && (
        <div className={styles.endMessage}>
          <span>✓ You&apos;ve seen it all</span>
        </div>
      )}
    </>
  )
}
