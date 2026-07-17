'use client'
import { useState, useRef, useEffect, useCallback, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import MediaCard from '@/components/MediaCard'
import { MediaItem } from '@/lib/tmdb'
import styles from './SearchClient.module.css'

export default function SearchClient({
  initialQ,
  results,
  total,
  totalPages,
  media
}: {
  initialQ: string
  results: MediaItem[]
  total: number
  totalPages: number
  media: 'all' | 'movie' | 'tv'
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [query, setQuery] = useState(initialQ)
  const inputRef = useRef<HTMLInputElement>(null)

  // Local Media Type Filter
  const [activeMediaFilter, setActiveMediaFilter] = useState<'all' | 'movie' | 'tv'>(media)

  // Infinite Scroll State
  const [allResults, setAllResults] = useState<MediaItem[]>(results)
  const [page, setPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  const observerTarget = useRef<HTMLDivElement>(null)

  // Reset infinite scroll state when initialQ changes (e.g. from SSR)
  useEffect(() => {
    setAllResults(results)
    setPage(1)
  }, [initialQ, results])

  const triggerSearch = useCallback(() => {
    const q = query.trim()
    if (q !== initialQ) {
      startTransition(() => {
        if (!q) {
          router.replace('/search')
        } else {
          router.replace(`/search?q=${encodeURIComponent(q)}`)
        }
      })
    }
  }, [query, initialQ, router])

  useEffect(() => {
    const timer = setTimeout(() => {
      triggerSearch()
    }, 300)
    return () => clearTimeout(timer)
  }, [triggerSearch])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    if (!q) {
      router.push('/search')
      return
    }
    router.push(`/search?q=${encodeURIComponent(q)}`)
  }

  const loadMore = useCallback(async () => {
    if (loadingMore || page >= totalPages) return
    setLoadingMore(true)
    try {
      const nextPage = page + 1
      const res = await fetch(`/api/tmdb/search/multi?query=${encodeURIComponent(initialQ)}&page=${nextPage}&include_adult=false`)
      if (res.ok) {
        const data = await res.json()
        const newResults = (data.results || []).filter((r: any) => r.media_type !== 'person')
        setAllResults(prev => {
          const existingIds = new Set(prev.map(item => `${item.media_type}-${item.id}`))
          const uniqueNew = newResults.filter((item: any) => !existingIds.has(`${item.media_type}-${item.id}`))
          return [...prev, ...uniqueNew]
        })
        setPage(nextPage)
      }
    } catch (err) {
      console.error('Failed to load more results', err)
    } finally {
      setLoadingMore(false)
    }
  }, [initialQ, page, totalPages, loadingMore])

  function setupInfiniteScroll(target: HTMLDivElement | null, onIntersect: () => void) {
    if (!target) return () => {}
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) onIntersect()
      },
      { threshold: 0.1 }
    )
    observer.observe(target)
    return () => observer.disconnect()
  }

  useEffect(() => {
    return setupInfiniteScroll(observerTarget.current, loadMore)
  }, [loadMore])

  const typeOf = (r: MediaItem) => r.media_type || (r.first_air_date ? 'tv' : 'movie')
  const filtered = activeMediaFilter === 'all' 
    ? allResults 
    : allResults.filter(r => typeOf(r) === activeMediaFilter)

  const handleFeelingLucky = () => {
    if (filtered.length === 0) return
    const randomIdx = Math.floor(Math.random() * filtered.length)
    const item = filtered[randomIdx]
    router.push(`/details/${item.id}?type=${typeOf(item)}`)
  }

  return (
    <>
      {/* Search input */}
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.inputWrap}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            ref={inputRef}
            className={styles.input}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search movies & TV shows…"
            autoFocus={!initialQ}
          />
          {query && (
            <button
              type="button"
              className={styles.clearBtn}
              onClick={() => { setQuery(''); inputRef.current?.focus() }}
            >✕</button>
          )}
        </div>
        <button type="submit" className="btn btn-primary" style={{ flexShrink: 0 }}>
          Search
        </button>
      </form>

      {initialQ && filtered.length === 0 && (
        <div className="empty-state">
          <div className="icon">🔎</div>
          <h3>No results for &ldquo;{initialQ}&rdquo;</h3>
          <p>Try a different title or browse the discovery page.</p>
        </div>
      )}

      {!initialQ && (
        <div className="empty-state">
          <div className="icon">🔍</div>
          <h3>Search anything</h3>
          <p>Type a movie or TV show title above to find it instantly.</p>
        </div>
      )}

      {filtered.length > 0 && (
        <>
          <div className={styles.controlsRow}>
            <div className={styles.mediaFilters}>
              {(['all', 'movie', 'tv'] as const).map(type => (
                <button
                  key={type}
                  className={`${styles.filterPill} ${activeMediaFilter === type ? styles.filterPillActive : ''}`}
                  onClick={() => setActiveMediaFilter(type)}
                >
                  {type === 'all' ? 'All Results' : type === 'movie' ? 'Movies' : 'TV Shows'}
                </button>
              ))}
            </div>
            
            <button className={styles.luckyBtn} onClick={handleFeelingLucky}>
              🎲 Feeling Lucky
            </button>
          </div>

          <p className={styles.resultInfo}>
            {filtered.length} of {total.toLocaleString()} results for &ldquo;<strong>{initialQ}</strong>&rdquo;
          </p>
          <div className="media-grid animate-fadeIn" style={{ opacity: isPending ? 0.6 : 1, transition: 'opacity 0.2s' }}>
            {filtered.map(item => (
              <MediaCard key={`${item.media_type}-${item.id}`} item={item} />
            ))}
          </div>

          {/* Infinite Scroll Trigger */}
          {page < totalPages && (
            <div ref={observerTarget} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              {loadingMore ? 'Loading more...' : 'Scroll for more'}
            </div>
          )}

          {/* End of Results */}
          {page >= totalPages && filtered.length > 0 && (
            <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <p>End of results</p>
            </div>
          )}
        </>
      )}
    </>
  )
}
