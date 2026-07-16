'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import MediaCard from '@/components/MediaCard'
import LoadingSpinner from '@/components/LoadingSpinner'
import { MediaItem, TMDBPage } from '@/lib/tmdb'

interface Props {
  initialItems: MediaItem[]
  totalPages: number
  media: 'all' | 'movie' | 'tv'
  // For 'all' mode, we receive both movie and TV initial data
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

async function fetchPopularPage(type: 'movie' | 'tv', page: number): Promise<TMDBPage<MediaItem>> {
  const qs = new URLSearchParams({
    sort_by: 'popularity.desc',
    with_original_language: 'en',
    'vote_count.gte': '50',
    page: String(page),
  })
  const res = await fetch(`/api/tmdb/discover/${type}?${qs}`)
  if (!res.ok) throw new Error('Failed to load more')
  return res.json()
}

function mergeAndDedupe(movies: MediaItem[], tvShows: MediaItem[]): MediaItem[] {
  // Tag items with media_type if not already set
  const tagged = [
    ...movies.map(i => ({ ...i, media_type: (i.media_type || 'movie') as 'movie' | 'tv' | 'person' })),
    ...tvShows.map(i => ({ ...i, media_type: (i.media_type || 'tv') as 'movie' | 'tv' | 'person' })),
  ]
  // Interleave by popularity (items already sorted by popularity from API)
  // Merge: pick alternately from movies and TV to keep a nice mix
  const result: MediaItem[] = []
  const maxLen = Math.max(movies.length, tvShows.length)
  const seen = new Set<number>()
  for (let i = 0; i < maxLen; i++) {
    if (i < movies.length && !seen.has(movies[i].id)) {
      result.push(tagged[i])
      seen.add(movies[i].id)
    }
    if (i < tvShows.length && !seen.has(tvShows[i].id)) {
      result.push(tagged[movies.length + i])
      seen.add(tvShows[i].id)
    }
  }
  return result
}

export default function PopularClient({
  initialItems,
  totalPages,
  media,
  initialMovieItems = [],
  initialTvItems = [],
  movieTotalPages = 1,
  tvTotalPages = 1,
}: Props) {
  const router = useRouter()

  // For 'all' mode, manage movie and tv pages separately
  const [movieItems, setMovieItems] = useState<MediaItem[]>(initialMovieItems)
  const [tvItems, setTvItems] = useState<MediaItem[]>(initialTvItems)
  const [moviePage, setMoviePage] = useState(1)
  const [tvPage, setTvPage] = useState(1)

  // For single-type modes
  const [items, setItems] = useState<MediaItem[]>(initialItems)
  const [page, setPage] = useState(1)

  const [loadingMore, setLoadingMore] = useState(false)
  const loadingRef = useRef(false)
  const [exhausted, setExhausted] = useState(
    media === 'all'
      ? moviePage >= Math.min(movieTotalPages, 20) && tvPage >= Math.min(tvTotalPages, 20)
      : page >= Math.min(totalPages, 20)
  )
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Combined items for 'all' mode
  const allItems = media === 'all' ? mergeAndDedupe(movieItems, tvItems) : items

  const loadMore = useCallback(async () => {
    if (loadingRef.current) return
    loadingRef.current = true
    setLoadingMore(true)

    try {
      if (media === 'all') {
        const nextMovie = moviePage + 1
        const nextTv = tvPage + 1
        const movieDone = nextMovie > Math.min(movieTotalPages, 20)
        const tvDone = nextTv > Math.min(tvTotalPages, 20)

        if (movieDone && tvDone) { setExhausted(true); return }

        const [newMovies, newTv] = await Promise.all([
          !movieDone ? fetchPopularPage('movie', nextMovie) : Promise.resolve(null),
          !tvDone ? fetchPopularPage('tv', nextTv) : Promise.resolve(null),
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

        const newMovieDone = (newMovies ? nextMovie : moviePage) >= Math.min(movieTotalPages, 20)
        const newTvDone = (newTv ? nextTv : tvPage) >= Math.min(tvTotalPages, 20)
        if (newMovieDone && newTvDone) setExhausted(true)
      } else {
        const next = page + 1
        if (next > Math.min(totalPages, 20)) { setExhausted(true); return }

        const data = await fetchPopularPage(media, next)
        setItems(prev => {
          const seen = new Set(prev.map(i => i.id))
          return [...prev, ...data.results.filter(i => !seen.has(i.id))]
        })
        setPage(next)
        if (next >= Math.min(totalPages, 20)) setExhausted(true)
      }
    } catch (e) {
      console.error('Failed to load more popular', e)
    } finally {
      setLoadingMore(false)
      loadingRef.current = false
    }
  }, [media, page, moviePage, tvPage, totalPages, movieTotalPages, tvTotalPages])

  useEffect(() => {
    if (exhausted) return
    return createScrollObserver(sentinelRef.current, loadMore)
  }, [loadMore, exhausted])

  const switchMedia = (type: 'all' | 'movie' | 'tv') => {
    router.push(`/popular?media=${type}`)
  }

  const displayItems = allItems

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
