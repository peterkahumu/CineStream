'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import MediaCard from '@/components/MediaCard'
import LoadingSpinner from '@/components/LoadingSpinner'
import { MediaItem, TMDBPage } from '@/lib/tmdb'
import { useRouter } from 'next/navigation'

interface Props {
  initialItems: MediaItem[]
  totalPages: number
  media: 'all' | 'movie' | 'tv'
  initialMovieItems?: MediaItem[]
  initialTvItems?: MediaItem[]
  movieTotalPages?: number
  tvTotalPages?: number
}

function createScrollObserver(
  sentinel: HTMLDivElement | null,
  onIntersect: () => void,
): (() => void) {
  if (!sentinel) return () => {}
  const observer = new IntersectionObserver(
    entries => { if (entries[0].isIntersecting) onIntersect() },
    { rootMargin: '300px' },
  )
  observer.observe(sentinel)
  return () => observer.disconnect()
}

function buildUpcomingParams(media: 'movie' | 'tv', page: number): URLSearchParams {
  const today = new Date()
  const future = new Date()
  future.setMonth(future.getMonth() + 3)
  const todayStr = today.toISOString().split('T')[0]
  const futureStr = future.toISOString().split('T')[0]

  const qs = new URLSearchParams({
    sort_by: 'popularity.desc',
    with_original_language: 'en',
    page: String(page),
  })

  if (media === 'movie') {
    qs.set('primary_release_date.gte', todayStr)
    qs.set('primary_release_date.lte', futureStr)
  } else {
    qs.set('first_air_date.gte', todayStr)
    qs.set('first_air_date.lte', futureStr)
  }

  return qs
}

async function fetchUpcomingPage(type: 'movie' | 'tv', page: number): Promise<TMDBPage<MediaItem>> {
  const qs = buildUpcomingParams(type, page)
  const res = await fetch(`/api/tmdb/discover/${type}?${qs}`)
  if (!res.ok) throw new Error('Failed to load more')
  return res.json()
}

function mergeInterleaved(movies: MediaItem[], tvShows: MediaItem[]): MediaItem[] {
  const result: MediaItem[] = []
  const seen = new Set<number>()
  const taggedMovies = movies.map(i => ({ ...i, media_type: 'movie' as const }))
  const taggedTv = tvShows.map(i => ({ ...i, media_type: 'tv' as const }))
  const maxLen = Math.max(movies.length, tvShows.length)
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

export default function UpcomingClient({
  initialItems,
  totalPages,
  media,
  initialMovieItems = [],
  initialTvItems = [],
  movieTotalPages = 1,
  tvTotalPages = 1,
}: Props) {
  const router = useRouter()

  const [movieItems, setMovieItems] = useState<MediaItem[]>(initialMovieItems)
  const [tvItems, setTvItems] = useState<MediaItem[]>(initialTvItems)
  const [moviePage, setMoviePage] = useState(1)
  const [tvPage, setTvPage] = useState(1)

  const [items, setItems] = useState<MediaItem[]>(initialItems)
  const [page, setPage] = useState(1)

  const [loadingMore, setLoadingMore] = useState(false)
  const loadingRef = useRef(false)
  const [exhausted, setExhausted] = useState(
    media === 'all'
      ? (movieTotalPages <= 1 && tvTotalPages <= 1)
      : totalPages <= 1
  )
  const sentinelRef = useRef<HTMLDivElement>(null)

  const displayItems = media === 'all' ? mergeInterleaved(movieItems, tvItems) : items

  const loadMore = useCallback(async () => {
    if (loadingRef.current) return
    loadingRef.current = true
    setLoadingMore(true)

    try {
      if (media === 'all') {
        const nextMovie = moviePage + 1
        const nextTv = tvPage + 1
        const movieDone = nextMovie > movieTotalPages
        const tvDone = nextTv > tvTotalPages
        if (movieDone && tvDone) { setExhausted(true); return }

        const [newMovies, newTv] = await Promise.all([
          !movieDone ? fetchUpcomingPage('movie', nextMovie) : Promise.resolve(null),
          !tvDone ? fetchUpcomingPage('tv', nextTv) : Promise.resolve(null),
        ])

        if (newMovies) {
          setMovieItems(prev => {
            const seen = new Set(prev.map(i => i.id))
            return [...prev, ...newMovies.results.filter(i => !seen.has(i.id))]
          })
          setMoviePage(nextMovie)
        }
        if (newTv) {
          setTvItems(prev => {
            const seen = new Set(prev.map(i => i.id))
            return [...prev, ...newTv.results.filter(i => !seen.has(i.id))]
          })
          setTvPage(nextTv)
        }

        const newMovieDone = (newMovies ? nextMovie : moviePage) >= movieTotalPages
        const newTvDone = (newTv ? nextTv : tvPage) >= tvTotalPages
        if (newMovieDone && newTvDone) setExhausted(true)
      } else {
        const next = page + 1
        if (next > totalPages) { setExhausted(true); return }

        const data = await fetchUpcomingPage(media, next)
        setItems(prev => {
          const seen = new Set(prev.map(i => i.id))
          return [...prev, ...data.results.filter(i => !seen.has(i.id))]
        })
        setPage(next)
        if (next >= totalPages) setExhausted(true)
      }
    } catch (e) {
      console.error('Failed to load more upcoming', e)
    } finally {
      setLoadingMore(false)
      loadingRef.current = false
    }
  }, [media, page, moviePage, tvPage, totalPages, movieTotalPages, tvTotalPages])

  // Re-attach observer only when not loading and not exhausted
  useEffect(() => {
    if (exhausted) return
    return createScrollObserver(sentinelRef.current, loadMore)
  }, [loadMore, exhausted])

  const switchMedia = (type: 'all' | 'movie' | 'tv') => {
    router.push(`/upcoming?media=${type}`)
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 'var(--space-lg)' }}>
        {(['all', 'movie', 'tv'] as const).map(t => (
          <button
            key={t}
            onClick={() => switchMedia(t)}
            className={`btn ${media === t ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.85rem', padding: '6px 16px' }}
          >
            {t === 'all' ? '🌐 All' : t === 'movie' ? '🎬 Movies' : '📺 TV Shows'}
          </button>
        ))}
      </div>

      {displayItems.length === 0 ? (
        <div className="empty-state">
          <div className="icon">🍿</div>
          <h3>Nothing scheduled yet</h3>
          <p>Check back soon for upcoming releases.</p>
        </div>
      ) : (
        <>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 'var(--space-md)', textAlign: 'right' }}>
            {displayItems.length} titles loaded
          </p>
          <div className="media-grid animate-fadeIn">
            {displayItems.map(item => (
              <MediaCard
                key={`${item.media_type ?? media}-${item.id}`}
                item={item}
                forcedType={media !== 'all' ? media : undefined}
              />
            ))}
          </div>
        </>
      )}

      {/* Sentinel — only rendered while not exhausted */}
      {!exhausted && (
        <div ref={sentinelRef} style={{ height: 1, marginTop: 'var(--space-xl)' }} aria-hidden="true" />
      )}

      {loadingMore && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--space-xl)' }}>
          <LoadingSpinner size="md" />
        </div>
      )}

      {exhausted && displayItems.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--space-xl)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          ✓ You&apos;ve seen it all
        </div>
      )}
    </>
  )
}
