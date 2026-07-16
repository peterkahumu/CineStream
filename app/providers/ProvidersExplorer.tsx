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

// ─── Single-type panel ────────────────────────────────────────────────────────

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
  const loadingRef = useRef(false)
  const [exhausted, setExhausted] = useState(totalPages <= 1)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Reset when provider or mediaType changes
  useEffect(() => {
    setItems(initialItems)
    setPage(1)
    setExhausted(totalPages <= 1)
  }, [initialItems, totalPages])

  const loadMore = useCallback(async () => {
    if (loadingRef.current) return
    const next = page + 1
    if (next > totalPages) return
    loadingRef.current = true
    setLoadingMore(true)
    try {
      const data = await fetchProviderPage(provider.id, mediaType, next)
      setItems(prev => {
        const seen = new Set(prev.map(i => i.id))
        return [...prev, ...data.results.filter(i => !seen.has(i.id))]
      })
      setPage(next)
      if (next >= totalPages) setExhausted(true)
    } catch { /* ignore */ } finally {
      setLoadingMore(false)
      loadingRef.current = false
    }
  }, [page, totalPages, provider.id, mediaType])

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

// ─── All-media panel (interleaved movies + TV) ────────────────────────────────

interface ProviderPanelAllProps {
  provider: typeof PROVIDERS[0]
  initialMovieItems: MediaItem[]
  initialTvItems: MediaItem[]
  movieTotalPages: number
  tvTotalPages: number
}

function ProviderPanelAll({ provider, initialMovieItems, initialTvItems, movieTotalPages, tvTotalPages }: ProviderPanelAllProps) {
  const [movieItems, setMovieItems] = useState<MediaItem[]>(initialMovieItems)
  const [tvItems, setTvItems] = useState<MediaItem[]>(initialTvItems)
  const [moviePage, setMoviePage] = useState(1)
  const [tvPage, setTvPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  const loadingRef = useRef(false)
  const [exhausted, setExhausted] = useState(movieTotalPages <= 1 && tvTotalPages <= 1)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMovieItems(initialMovieItems)
    setTvItems(initialTvItems)
    setMoviePage(1)
    setTvPage(1)
    setExhausted(movieTotalPages <= 1 && tvTotalPages <= 1)
  }, [initialMovieItems, initialTvItems, movieTotalPages, tvTotalPages])

  const displayItems = mergeInterleaved(movieItems, tvItems)

  const loadMore = useCallback(async () => {
    if (loadingRef.current) return
    loadingRef.current = true
    setLoadingMore(true)
    try {
      const nextMovie = moviePage + 1
      const nextTv = tvPage + 1
      const movieDone = nextMovie > movieTotalPages
      const tvDone = nextTv > tvTotalPages
      if (movieDone && tvDone) { setExhausted(true); return }

      const [newMovies, newTv] = await Promise.all([
        !movieDone ? fetchProviderPage(provider.id, 'movie', nextMovie) : Promise.resolve(null),
        !tvDone ? fetchProviderPage(provider.id, 'tv', nextTv) : Promise.resolve(null),
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
    } catch { /* ignore */ } finally {
      setLoadingMore(false)
      loadingRef.current = false
    }
  }, [moviePage, tvPage, movieTotalPages, tvTotalPages, provider.id])

  useEffect(() => {
    if (exhausted) return
    return createScrollObserver(sentinelRef.current, loadMore)
  }, [loadMore, exhausted])

  if (displayItems.length === 0) {
    return (
      <div className="empty-state">
        <div className="icon">{provider.emoji}</div>
        <h3>Nothing available right now</h3>
        <p>Check back later for new titles</p>
      </div>
    )
  }

  return (
    <>
      <div className="media-grid animate-fadeIn">
        {displayItems.map(item => (
          <MediaCard key={`${item.media_type}-${item.id}`} item={item} />
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

// ─── Main explorer ────────────────────────────────────────────────────────────

interface Props {
  initialData: Record<number, { movie: TMDBPage<MediaItem>; tv: TMDBPage<MediaItem> }>
}

export default function ProvidersExplorer({ initialData }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const initProviderId = Number(searchParams.get('provider')) || 8
  const rawMedia = searchParams.get('media')
  const initMedia = (rawMedia === 'movie' ? 'movie' : rawMedia === 'tv' ? 'tv' : 'all') as 'all' | 'movie' | 'tv'

  const [activeProvider, setActiveProvider] = useState<number>(
    PROVIDERS.find(p => p.id === initProviderId) ? initProviderId : 8
  )
  const [mediaType, setMediaType] = useState<'all' | 'movie' | 'tv'>(initMedia)
  const [clientLoading, setClientLoading] = useState(false)
  const [clientData, setClientData] = useState<{ items: MediaItem[]; totalPages: number } | null>(null)
  const [clientMovieData, setClientMovieData] = useState<{ items: MediaItem[]; totalPages: number } | null>(null)
  const [clientTvData, setClientTvData] = useState<{ items: MediaItem[]; totalPages: number } | null>(null)

  const provider = PROVIDERS.find(p => p.id === activeProvider)!
  const serverData = initialData[activeProvider]

  function fetchClientData(providerId: number, type: 'all' | 'movie' | 'tv') {
    const data = initialData[providerId]
    if (data) {
      setClientData(null)
      setClientMovieData(null)
      setClientTvData(null)
      return
    }
    // Not pre-fetched — load client side
    setClientLoading(true)
    if (type === 'all') {
      Promise.all([
        fetchProviderPage(providerId, 'movie', 1),
        fetchProviderPage(providerId, 'tv', 1),
      ])
        .then(([m, t]) => {
          setClientMovieData({ items: m.results, totalPages: m.total_pages })
          setClientTvData({ items: t.results, totalPages: t.total_pages })
        })
        .catch(() => {
          setClientMovieData({ items: [], totalPages: 0 })
          setClientTvData({ items: [], totalPages: 0 })
        })
        .finally(() => setClientLoading(false))
    } else {
      fetchProviderPage(providerId, type, 1)
        .then(d => setClientData({ items: d.results, totalPages: d.total_pages }))
        .catch(() => setClientData({ items: [], totalPages: 0 }))
        .finally(() => setClientLoading(false))
    }
  }

  // When provider or media switches — if no SSR data, fetch client-side
  useEffect(() => {
    fetchClientData(activeProvider, mediaType)
  }, [activeProvider, mediaType, initialData])

  function handleProviderSwitch(id: number) {
    setActiveProvider(id)
    setClientData(null)
    setClientMovieData(null)
    setClientTvData(null)
    router.replace(`/providers?provider=${id}&media=${mediaType}`, { scroll: false })
  }

  function handleMediaSwitch(type: 'all' | 'movie' | 'tv') {
    setMediaType(type)
    setClientData(null)
    setClientMovieData(null)
    setClientTvData(null)
    router.replace(`/providers?provider=${activeProvider}&media=${type}`, { scroll: false })
  }

  // Resolve panel data
  let panelProps: { items: MediaItem[]; totalPages: number } | null = null
  let panelAllProps: { movieItems: MediaItem[]; tvItems: MediaItem[]; movieTotalPages: number; tvTotalPages: number } | null = null

  if (mediaType === 'all') {
    const movieItems = clientMovieData?.items ?? serverData?.movie.results ?? []
    const tvItems = clientTvData?.items ?? serverData?.tv.results ?? []
    const mPages = clientMovieData?.totalPages ?? serverData?.movie.total_pages ?? 0
    const tPages = clientTvData?.totalPages ?? serverData?.tv.total_pages ?? 0
    panelAllProps = { movieItems, tvItems, movieTotalPages: mPages, tvTotalPages: tPages }
  } else {
    panelProps = clientData
      ? { items: clientData.items, totalPages: clientData.totalPages }
      : serverData
        ? { items: serverData[mediaType].results, totalPages: serverData[mediaType].total_pages }
        : { items: [], totalPages: 0 }
  }

  const totalCount = mediaType === 'all'
    ? (panelAllProps ? panelAllProps.movieItems.length + panelAllProps.tvItems.length : 0)
    : (panelProps?.items.length ?? 0)

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
          {(['all', 'movie', 'tv'] as const).map(t => (
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
              {t === 'all' ? '🌐 All' : t === 'movie' ? '🎬 Movies' : '📺 TV Shows'}
            </button>
          ))}
        </div>
        <span className={styles.mediaCount}>
          {totalCount > 0 && `${totalCount} titles`}
        </span>
      </div>

      {/* Content */}
      {clientLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-2xl)' }}>
          <LoadingSpinner size="lg" />
        </div>
      ) : mediaType === 'all' && panelAllProps ? (
        <ProviderPanelAll
          key={`${activeProvider}-all`}
          provider={provider}
          initialMovieItems={panelAllProps.movieItems}
          initialTvItems={panelAllProps.tvItems}
          movieTotalPages={panelAllProps.movieTotalPages}
          tvTotalPages={panelAllProps.tvTotalPages}
        />
      ) : panelProps ? (
        <ProviderPanel
          key={`${activeProvider}-${mediaType}`}
          provider={provider}
          mediaType={mediaType as 'movie' | 'tv'}
          initialItems={panelProps.items}
          totalPages={panelProps.totalPages}
        />
      ) : null}
    </div>
  )
}
