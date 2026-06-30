'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import MediaCard from '@/components/MediaCard'
import LoadingSpinner from '@/components/LoadingSpinner'
import { MediaItem, TMDBPage } from '@/lib/tmdb'

interface Props {
  initialItems: MediaItem[]
  totalPages: number
  providerId: number
  mediaType: 'movie' | 'tv'
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

export default function ProviderClient({ initialItems, totalPages, providerId, mediaType }: Props) {
  const router = useRouter()
  const [items, setItems] = useState<MediaItem[]>(initialItems)
  const [page, setPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  const [exhausted, setExhausted] = useState(page >= Math.min(totalPages, 20))
  const sentinelRef = useRef<HTMLDivElement>(null)

  const loadMore = useCallback(async () => {
    const next = page + 1
    if (loadingMore || next > Math.min(totalPages, 20)) return
    setLoadingMore(true)
    try {
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
      const gteDate = sixMonthsAgo.toISOString().split('T')[0]

      const dateKey = mediaType === 'movie' ? 'primary_release_date.gte' : 'first_air_date.gte'
      const qs = new URLSearchParams({
        with_watch_providers: String(providerId),
        watch_region: 'US',
        sort_by: 'popularity.desc',
        with_original_language: 'en',
        [dateKey]: gteDate,
        page: String(next),
      })

      const res = await fetch(`/api/tmdb/discover/${mediaType}?${qs}`)
      if (!res.ok) throw new Error('Failed to load more')
      const data: TMDBPage<MediaItem> = await res.json()

      setItems(prev => {
        const seen = new Set(prev.map(i => i.id))
        return [...prev, ...data.results.filter(i => !seen.has(i.id))]
      })
      setPage(next)
      if (next >= Math.min(totalPages, 20)) setExhausted(true)
    } catch (e) {
      console.error('Failed to load more', e)
    } finally {
      setLoadingMore(false)
    }
  }, [page, loadingMore, totalPages, providerId, mediaType])

  useEffect(() => {
    return createScrollObserver(sentinelRef.current, loadMore)
  }, [loadMore, exhausted])

  const switchMedia = (type: 'movie' | 'tv') => {
    router.push(`/provider/${providerId}?media=${type}`)
  }

  return (
    <>
      {/* Media type toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 'var(--space-lg)' }}>
        {(['movie', 'tv'] as const).map(t => (
          <button
            key={t}
            onClick={() => switchMedia(t)}
            className={`btn ${mediaType === t ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.85rem', padding: '6px 16px' }}
          >
            {t === 'movie' ? '🎬 Movies' : '📺 TV Shows'}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <div className="icon">🎬</div>
          <h3>Nothing here yet</h3>
          <p>Check back soon for new releases.</p>
        </div>
      ) : (
        <>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 'var(--space-md)', textAlign: 'right' }}>
            {items.length} titles loaded
          </p>
          <div className="media-grid animate-fadeIn">
            {items.map(item => (
              <MediaCard key={`${mediaType}-${item.id}`} item={item} forcedType={mediaType} />
            ))}
          </div>
        </>
      )}

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
