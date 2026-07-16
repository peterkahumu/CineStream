'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import MediaCard from '@/components/MediaCard'
import LoadingSpinner from '@/components/LoadingSpinner'
import { MediaItem, TMDBPage } from '@/lib/tmdb'
import styles from './ProviderClient.module.css'

const PROVIDERS = [
  { id: 8,   name: 'Netflix',     emoji: '🔴', color: '#e50914' },
  { id: 9,   name: 'Prime Video', emoji: '🔵', color: '#00a8e1' },
  { id: 337, name: 'Disney+',     emoji: '✨', color: '#113ccf' },
]

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
  const [exhausted, setExhausted] = useState(page >= totalPages)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const loadMore = useCallback(async () => {
    const next = page + 1
    if (loadingMore || next > totalPages) return
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
      if (next >= totalPages) setExhausted(true)
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

  const switchProvider = (id: number) => {
    router.push(`/provider/${id}?media=${mediaType}`)
  }

  return (
    <>
      {/* Provider switcher */}
      <div className={styles.providerSwitcher}>
        <span className={styles.switcherLabel}>Provider:</span>
        <div className={styles.providerTabs}>
          {PROVIDERS.map(p => (
            <button
              key={p.id}
              onClick={() => switchProvider(p.id)}
              className={`${styles.providerTab} ${providerId === p.id ? styles.activeProvider : ''}`}
              style={providerId === p.id ? { borderColor: p.color, color: p.color } : {}}
            >
              <span>{p.emoji}</span>
              <span className={styles.providerTabName}>{p.name}</span>
            </button>
          ))}
        </div>
      </div>

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
