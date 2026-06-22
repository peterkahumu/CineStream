'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import MediaCard from '@/components/MediaCard'
import LoadingSpinner from '@/components/LoadingSpinner'
import { searchMulti, MediaItem } from '@/lib/tmdb'
import styles from './page.module.css'

function SearchContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialQ = searchParams.get('q') || ''

  const [query, setQuery] = useState(initialQ)
  const [committed, setCommitted] = useState(initialQ)
  const [results, setResults] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [filter, setFilter] = useState<'all' | 'movie' | 'tv'>('all')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    const q = committed.trim()
    const ctrl = new AbortController()
    
    const fetch = async () => {
      await Promise.resolve()
      if (!q) { setResults([]); return }
      setLoading(true)
      setError(null)
      try {
        const d = await searchMulti(q)
        if (ctrl.signal.aborted) return
        const valid = (d.results || []).filter(r => r.media_type !== 'person')
        setResults(valid)
        setTotal(d.total_results || valid.length)
      } catch (err) {
        if (!ctrl.signal.aborted) setError('Search failed. Check your TMDB_API_KEY in .env.local.')
        console.error(err)
      } finally {
        if (!ctrl.signal.aborted) setLoading(false)
      }
    }
    fetch()
    return () => ctrl.abort()
  }, [committed])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    setCommitted(q)
    router.replace(`/search?q=${encodeURIComponent(q)}`, { scroll: false })
  }

  const typeOf = (r: MediaItem) => r.media_type || (r.first_air_date ? 'tv' : 'movie')
  const filtered = filter === 'all' ? results : results.filter(r => typeOf(r) === filter)
  const movieCount = results.filter(r => typeOf(r) === 'movie').length
  const tvCount    = results.filter(r => typeOf(r) === 'tv').length

  return (
    <main className="page-content">
      <div className="page-container">
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
            />
            {query && (
              <button
                type="button"
                className={styles.clearBtn}
                onClick={() => { setQuery(''); setCommitted(''); setResults([]); inputRef.current?.focus() }}
              >✕</button>
            )}
          </div>
          <button type="submit" className="btn btn-primary" style={{ flexShrink: 0 }}>
            Search
          </button>
        </form>

        {/* Filter tabs */}
        {results.length > 0 && (
          <div className={styles.tabs}>
            {([
              ['all',   `All (${results.length})`],
              ['movie', `Movies (${movieCount})`],
              ['tv',    `TV Shows (${tvCount})`],
            ] as [typeof filter, string][]).map(([val, label]) => (
              <button
                key={val}
                className={`${styles.tab} ${filter === val ? styles.tabActive : ''}`}
                onClick={() => setFilter(val)}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {loading && <LoadingSpinner size="lg" text={`Searching for "${committed}"…`} />}
        {error && !loading && <div className={styles.error}>⚠️ {error}</div>}

        {!loading && !error && committed && filtered.length === 0 && (
          <div className="empty-state">
            <div className="icon">🔎</div>
            <h3>No results for &ldquo;{committed}&rdquo;</h3>
            <p>Try a different title or browse the discovery page.</p>
          </div>
        )}

        {!committed && (
          <div className="empty-state">
            <div className="icon">🔍</div>
            <h3>Search anything</h3>
            <p>Type a movie or TV show title above to find it instantly.</p>
          </div>
        )}

        {filtered.length > 0 && !loading && (
          <>
            <p className={styles.resultInfo}>
              {filtered.length} of {total.toLocaleString()} results for &ldquo;<strong>{committed}</strong>&rdquo;
            </p>
            <div className="media-grid animate-fadeIn">
              {filtered.map(item => (
                <MediaCard key={`${item.media_type}-${item.id}`} item={item} />
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<LoadingSpinner size="lg" text="Loading…" />}>
      <SearchContent />
    </Suspense>
  )
}
