'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import MediaCard from '@/components/MediaCard'
import { MediaItem } from '@/lib/tmdb'
import styles from './page.module.css'

export default function SearchClient({
  initialQ,
  results,
  total
}: {
  initialQ: string
  results: MediaItem[]
  total: number
}) {
  const router = useRouter()
  // No useEffect sync needed — parent passes key={initialQ} so this
  // component remounts when the query changes, resetting state naturally.
  const [query, setQuery] = useState(initialQ)
  const [filter, setFilter] = useState<'all' | 'movie' | 'tv'>('all')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    if (!q) {
      router.push('/search')
      return
    }
    router.push(`/search?q=${encodeURIComponent(q)}`)
  }

  const typeOf = (r: MediaItem) => r.media_type || (r.first_air_date ? 'tv' : 'movie')
  const filtered = filter === 'all' ? results : results.filter(r => typeOf(r) === filter)
  const movieCount = results.filter(r => typeOf(r) === 'movie').length
  const tvCount    = results.filter(r => typeOf(r) === 'tv').length

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
          <p className={styles.resultInfo}>
            {filtered.length} of {total.toLocaleString()} results for &ldquo;<strong>{initialQ}</strong>&rdquo;
          </p>
          <div className="media-grid animate-fadeIn">
            {filtered.map(item => (
              <MediaCard key={`${item.media_type}-${item.id}`} item={item} />
            ))}
          </div>
        </>
      )}
    </>
  )
}
