'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import MediaCard from '@/components/MediaCard'
import LoadingSpinner from '@/components/LoadingSpinner'
import { MediaItem, TMDBPage } from '@/lib/tmdb'

interface Props {
  initialItems: MediaItem[]
  totalPages: number
  media: 'all' | 'movie' | 'tv'
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

async function fetchTrendingPage(media: 'all' | 'movie' | 'tv', page: number): Promise<TMDBPage<MediaItem>> {
  const qs = new URLSearchParams({ page: String(page), with_original_language: 'en' })
  const res = await fetch(`/api/tmdb/trending/${media}/week?${qs}`)
  if (!res.ok) throw new Error(`Trending fetch failed: ${res.status}`)
  return res.json()
}

export default function TrendingClient({ initialItems, totalPages, media }: Props) {
  const [items, setItems] = useState<MediaItem[]>(initialItems)
  const [page, setPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  // loadingRef prevents double-fires when the sentinel triggers during a pending request
  const loadingRef = useRef(false)
  const [exhausted, setExhausted] = useState(totalPages <= 1)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Client-side filter tab — works on already-fetched items without a new network request
  const [filter, setFilter] = useState<'all' | 'movie' | 'tv'>('all')
  const filtered = filter === 'all' ? items : items.filter(i => (i.media_type ?? 'movie') === filter)

  const loadMore = useCallback(async () => {
    // Guard against concurrent calls without depending on the loadingMore state
    if (loadingRef.current) return
    const next = page + 1
    if (next > Math.min(totalPages, 10)) { setExhausted(true); return }

    loadingRef.current = true
    setLoadingMore(true)
    try {
      const data = await fetchTrendingPage(media, next)
      setItems(prev => {
        const seen = new Set(prev.map(i => i.id))
        return [...prev, ...data.results.filter(i => !seen.has(i.id))]
      })
      setPage(next)
      if (next >= Math.min(totalPages, 10)) setExhausted(true)
    } catch (e) {
      console.error('Failed to load more trending', e)
    } finally {
      setLoadingMore(false)
      loadingRef.current = false
    }
  }, [page, totalPages, media])

  // Re-attach observer only when loadMore or exhausted changes.
  // Sentinel is conditionally rendered below, so once exhausted the observer auto-disconnects.
  useEffect(() => {
    if (exhausted) return
    return createScrollObserver(sentinelRef.current, loadMore)
  }, [loadMore, exhausted])

  return (
    <>
      {/* Media filter tabs — client-only filter on already-fetched data */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 'var(--space-lg)' }}>
        {(['all', 'movie', 'tv'] as const).map(t => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`btn ${filter === t ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.85rem', padding: '6px 16px' }}
          >
            {t === 'all' ? 'All' : t === 'movie' ? '🎬 Movies' : '📺 TV Shows'}
          </button>
        ))}
      </div>

      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 'var(--space-md)', textAlign: 'right' }}>
        {filtered.length} titles loaded
      </p>

      <div className="media-grid animate-fadeIn">
        {filtered.map(item => (
          <MediaCard key={`${item.media_type ?? media}-${item.id}`} item={item} />
        ))}
      </div>

      {/* Sentinel only rendered while there is more content to load */}
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
