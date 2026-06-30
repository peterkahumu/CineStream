'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import MediaCard from '@/components/MediaCard'
import LoadingSpinner from '@/components/LoadingSpinner'
import { MediaItem, TMDBPage } from '@/lib/tmdb'
import { useRouter } from 'next/navigation'

interface Props {
  initialItems: MediaItem[]
  totalPages: number
  media: 'movie' | 'tv'
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

export default function UpcomingClient({ initialItems, totalPages, media }: Props) {
  const router = useRouter()
  const [items, setItems] = useState<MediaItem[]>(initialItems)
  const [page, setPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  const [exhausted, setExhausted] = useState(totalPages <= 1)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const loadMore = useCallback(async () => {
    const next = page + 1
    if (loadingMore || next > Math.min(totalPages, 20)) return
    setLoadingMore(true)
    try {
      const qs = buildUpcomingParams(media, next)
      const res = await fetch(`/api/tmdb/discover/${media}?${qs}`)
      if (!res.ok) throw new Error('Failed to load more')
      const data: TMDBPage<MediaItem> = await res.json()
      setItems(prev => {
        const seen = new Set(prev.map(i => i.id))
        return [...prev, ...data.results.filter(i => !seen.has(i.id))]
      })
      setPage(next)
      if (next >= Math.min(totalPages, 20)) setExhausted(true)
    } catch (e) {
      console.error('Failed to load more upcoming', e)
    } finally {
      setLoadingMore(false)
    }
  }, [page, loadingMore, totalPages, media])

  // Re-attach observer only when not loading and not exhausted
  useEffect(() => {
    if (exhausted) return
    return createScrollObserver(sentinelRef.current, loadMore)
  }, [loadMore, exhausted])

  const switchMedia = (type: 'movie' | 'tv') => {
    router.push(`/upcoming?media=${type}`)
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 'var(--space-lg)' }}>
        {(['movie', 'tv'] as const).map(t => (
          <button
            key={t}
            onClick={() => switchMedia(t)}
            className={`btn ${media === t ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.85rem', padding: '6px 16px' }}
          >
            {t === 'movie' ? '🎬 Movies' : '📺 TV Shows'}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <div className="icon">🍿</div>
          <h3>Nothing scheduled yet</h3>
          <p>Check back soon for upcoming releases.</p>
        </div>
      ) : (
        <>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 'var(--space-md)', textAlign: 'right' }}>
            {items.length} titles loaded
          </p>
          <div className="media-grid animate-fadeIn">
            {items.map(item => (
              <MediaCard key={`${media}-${item.id}`} item={item} forcedType={media} />
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

      {exhausted && items.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--space-xl)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          ✓ You&apos;ve seen it all
        </div>
      )}
    </>
  )
}
