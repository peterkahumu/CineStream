'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import MediaCard from '@/components/MediaCard'
import LoadingSpinner from '@/components/LoadingSpinner'
import { MediaItem, TMDBPage } from '@/lib/tmdb'
import styles from './ProvidersExplorer.module.css'

const PROVIDERS = [
  {
    id: 8,
    name: 'Netflix',
    shortName: 'N',
    color: '#e50914',
    gradient: 'linear-gradient(135deg, #e50914 0%, #7a0a0a 100%)',
    emoji: '🔴',
    tagline: 'The world\'s leading streaming platform',
  },
  {
    id: 9,
    name: 'Prime Video',
    shortName: 'P',
    color: '#00a8e1',
    gradient: 'linear-gradient(135deg, #00a8e1 0%, #0050a0 100%)',
    emoji: '🔵',
    tagline: 'Amazon Originals and licensed blockbusters',
  },
  {
    id: 337,
    name: 'Disney+',
    shortName: 'D+',
    color: '#113ccf',
    gradient: 'linear-gradient(135deg, #1a4ef5 0%, #0a1e6e 100%)',
    emoji: '✨',
    tagline: 'Disney, Marvel, Star Wars, Pixar & Nat Geo',
  },
]

function createScrollObserver(
  sentinel: HTMLDivElement | null,
  onIntersect: () => void,
): () => void {
  if (!sentinel) return () => {}
  const observer = new IntersectionObserver(
    entries => { if (entries[0].isIntersecting) onIntersect() },
    { rootMargin: '300px' },
  )
  observer.observe(sentinel)
  return () => observer.disconnect()
}

async function fetchProviderPage(
  providerId: number,
  mediaType: 'movie' | 'tv',
  page: number,
): Promise<TMDBPage<MediaItem>> {
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
    page: String(page),
  })
  const res = await fetch(`/api/tmdb/discover/${mediaType}?${qs}`)
  if (!res.ok) throw new Error('Failed')
  return res.json()
}

interface ProviderPanelProps {
  provider: typeof PROVIDERS[0]
  mediaType: 'movie' | 'tv'
  initialItems: MediaItem[]
  totalPages: number
}

function ProviderPanel({ provider, mediaType, initialItems, totalPages }: ProviderPanelProps) {
  const [items, setItems] = useState<MediaItem[]>(initialItems)
  const [page, setPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  const [exhausted, setExhausted] = useState(totalPages <= 1)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Reset when provider or mediaType changes
  useEffect(() => {
    setItems(initialItems)
    setPage(1)
    setExhausted(totalPages <= 1)
  }, [initialItems, totalPages])

  const loadMore = useCallback(async () => {
    const next = page + 1
    if (loadingMore || next > Math.min(totalPages, 15)) return
    setLoadingMore(true)
    try {
      const data = await fetchProviderPage(provider.id, mediaType, next)
      setItems(prev => {
        const seen = new Set(prev.map(i => i.id))
        return [...prev, ...data.results.filter(i => !seen.has(i.id))]
      })
      setPage(next)
      if (next >= Math.min(totalPages, 15)) setExhausted(true)
    } catch { /* ignore */ } finally { setLoadingMore(false) }
  }, [page, loadingMore, totalPages, provider.id, mediaType])

  useEffect(() => {
    if (exhausted) return
    return createScrollObserver(sentinelRef.current, loadMore)
  }, [loadMore, exhausted])

  if (items.length === 0) {
    return (
      <div className="empty-state">
        <div className="icon">{provider.emoji}</div>
        <h3>Nothing available right now</h3>
        <p>Check back later for new {mediaType === 'movie' ? 'movies' : 'shows'}</p>
      </div>
    )
  }

  return (
    <>
      <div className="media-grid animate-fadeIn">
        {items.map(item => (
          <MediaCard key={`${mediaType}-${item.id}`} item={item} forcedType={mediaType} />
        ))}
      </div>

      {!exhausted && (
        <div ref={sentinelRef} style={{ height: 1, marginTop: 'var(--space-xl)' }} aria-hidden />
      )}
      {loadingMore && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--space-lg)' }}>
          <LoadingSpinner size="md" />
        </div>
      )}
      {exhausted && (
        <div style={{ textAlign: 'center', marginTop: 'var(--space-xl)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          ✓ You&apos;ve seen it all
        </div>
      )}
    </>
  )
}

interface Props {
  initialData: Record<number, { movie: TMDBPage<MediaItem>; tv: TMDBPage<MediaItem> }>
}

export default function ProvidersExplorer({ initialData }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const initProviderId = Number(searchParams.get('provider')) || 8
  const initMedia = (searchParams.get('media') === 'tv' ? 'tv' : 'movie') as 'movie' | 'tv'

  const [activeProvider, setActiveProvider] = useState<number>(
    PROVIDERS.find(p => p.id === initProviderId) ? initProviderId : 8
  )
  const [mediaType, setMediaType] = useState<'movie' | 'tv'>(initMedia)
  const [clientLoading, setClientLoading] = useState(false)
  const [clientData, setClientData] = useState<{ items: MediaItem[]; totalPages: number } | null>(null)

  const provider = PROVIDERS.find(p => p.id === activeProvider)!
  const serverData = initialData[activeProvider]

  // When provider or media switches — if no SSR data, fetch client-side
  useEffect(() => {
    const data = initialData[activeProvider]
    if (data) {
      setClientData(null) // use server data
      return
    }
    // Not pre-fetched — load client side
    setClientLoading(true)
    fetchProviderPage(activeProvider, mediaType, 1)
      .then(d => setClientData({ items: d.results, totalPages: d.total_pages }))
      .catch(() => setClientData({ items: [], totalPages: 0 }))
      .finally(() => setClientLoading(false))
  }, [activeProvider, mediaType, initialData])

  const handleProviderSwitch = (id: number) => {
    setActiveProvider(id)
    setClientData(null)
    const url = new URL(window.location.href)
    url.searchParams.set('provider', String(id))
    url.searchParams.set('media', mediaType)
    router.replace(url.pathname + url.search, { scroll: false })
  }

  const handleMediaSwitch = (type: 'movie' | 'tv') => {
    setMediaType(type)
    setClientData(null)
    const url = new URL(window.location.href)
    url.searchParams.set('provider', String(activeProvider))
    url.searchParams.set('media', type)
    router.replace(url.pathname + url.search, { scroll: false })
  }

  const panelData = clientData
    ? { items: clientData.items, totalPages: clientData.totalPages }
    : serverData
      ? { items: serverData[mediaType].results, totalPages: serverData[mediaType].total_pages }
      : { items: [], totalPages: 0 }

  return (
    <div className={styles.explorer}>
      {/* Provider tab bar */}
      <div className={styles.providerTabs}>
        {PROVIDERS.map(p => (
          <button
            key={p.id}
            className={`${styles.providerTab} ${activeProvider === p.id ? styles.providerTabActive : ''}`}
            style={activeProvider === p.id ? {
              background: p.gradient,
              borderColor: 'transparent',
            } : {}}
            onClick={() => handleProviderSwitch(p.id)}
          >
            <span className={styles.providerTabEmoji}>{p.emoji}</span>
            <span className={styles.providerTabName}>{p.name}</span>
          </button>
        ))}
      </div>

      {/* Active provider hero strip */}
      <div
        className={styles.providerHero}
        style={{ background: provider.gradient }}
      >
        <div className={styles.providerHeroContent}>
          <div className={styles.providerHeroIcon}>{provider.emoji}</div>
          <div>
            <h2 className={styles.providerHeroName}>{provider.name}</h2>
            <p className={styles.providerHeroTagline}>{provider.tagline}</p>
          </div>
        </div>
      </div>

      {/* Media type toggle */}
      <div className={styles.mediaToggle}>
        <span className={styles.mediaToggleLabel}>Browse:</span>
        <div className={styles.mediaToggleBtns}>
          {(['movie', 'tv'] as const).map(t => (
            <button
              key={t}
              onClick={() => handleMediaSwitch(t)}
              className={`btn ${mediaType === t ? 'btn-primary' : 'btn-secondary'}`}
              style={{
                fontSize: '0.82rem',
                padding: '6px 18px',
                ...(mediaType === t ? { background: provider.color, borderColor: provider.color } : {}),
              }}
            >
              {t === 'movie' ? '🎬 Movies' : '📺 TV Shows'}
            </button>
          ))}
        </div>
        <span className={styles.mediaCount}>
          {panelData.items.length > 0 && `${panelData.items.length} titles`}
        </span>
      </div>

      {/* Content */}
      {clientLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-2xl)' }}>
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <ProviderPanel
          key={`${activeProvider}-${mediaType}`}
          provider={provider}
          mediaType={mediaType}
          initialItems={panelData.items}
          totalPages={panelData.totalPages}
        />
      )}
    </div>
  )
}
