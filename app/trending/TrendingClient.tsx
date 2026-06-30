'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import MediaCard from '@/components/MediaCard'
import LoadingSpinner from '@/components/LoadingSpinner'
import { tmdbFetch, MediaItem, TMDBPage } from '@/lib/tmdb'

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

export default function TrendingClient({ initialItems, totalPages, media }: Props) {
  const [items, setItems] = useState<MediaItem[]>(initialItems)
  const [page, setPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  const [exhausted, setExhausted] = useState(page >= Math.min(totalPages, 10))
  const sentinelRef = useRef<HTMLDivElement>(null)

  const loadMore = useCallback(async () => {
    const next = page + 1
    if (loadingMore || next > Math.min(totalPages, 10)) return
    setLoadingMore(true)
    try {
      const data = await tmdbFetch<TMDBPage<MediaItem>>(`/trending/${media}/week`, { page: next, with_original_language: 'en' })
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
    }
  }, [page, loadingMore, totalPages, media])

  useEffect(() => {
    return createScrollObserver(sentinelRef.current, loadMore)
  }, [loadMore, exhausted])

  // Filter tabs
  const [filter, setFilter] = useState<'all' | 'movie' | 'tv'>('all')
  const filtered = filter === 'all' ? items : items.filter(i => (i.media_type ?? 'movie') === filter)

  return (
    <>
      {/* Media filter tabs */}
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

      <div ref={sentinelRef} style={{ height: 1, marginTop: 'var(--space-xl)' }} aria-hidden="true" />

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
