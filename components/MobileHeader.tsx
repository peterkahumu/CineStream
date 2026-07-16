'use client'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState, useRef, useCallback, useEffect } from 'react'
import { searchMulti, MediaItem, posterUrl, mediaType } from '@/lib/tmdb'
import styles from './MobileHeader.module.css'

const CATEGORIES = [
  { href: '/popular',     label: 'Popular',     icon: '🔥' },
  { href: '/trending',    label: 'Trending',    icon: '📈' },
  { href: '/upcoming',    label: 'Coming Soon', icon: '⏳' },
  { href: '/top-rated',   label: 'Top Rated',   icon: '⭐' },
  { href: '/now-playing', label: 'In Theatres', icon: '🎬' },
  { href: '/discover?genre=28', label: 'Action', icon: '💥' },
  { href: '/discover?genre=35', label: 'Comedy', icon: '😂' },
  { href: '/discover?genre=27', label: 'Horror', icon: '👻' },
  { href: '/discover?genre=878', label: 'Sci-Fi', icon: '🛸' },
  { href: '/discover?genre=10749', label: 'Romance', icon: '❤️' },
  { href: '/discover?genre=80,9648', label: 'Crime & Mystery', icon: '🕵️' },
  { href: '/discover?genre=10751', label: 'Family', icon: '🧸' },
  { href: '/discover?genre=16&country=JP', label: 'Anime', icon: '🌸' },
  { href: '/discover?media=tv&country=KR', label: 'K-Drama', icon: '🇰🇷' },
  { href: '/discover?media=tv&genre=10764', label: 'Reality TV', icon: '💅' },
  { href: '/discover?media=movie&country=IN', label: 'Bollywood', icon: '🇮🇳' },
  { href: '/discover?sort=revenue.desc', label: 'Blockbusters', icon: '🍿' },
]

// ─── Sub-component keeps img-error state isolated per search result ────────────
function ResultThumb({ src, alt, className }: { src: string | null; alt: string; className?: string }) {
  const [imgErr, setImgErr] = useState(false)

  if (!src || imgErr) {
    return (
      <div
        className={className}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--surface-raised)',
          borderRadius: 4,
          fontSize: '1.2rem',
        }}
      >
        🎬
      </div>
    )
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={40}
      height={56}
      className={className}
      style={{ objectFit: 'cover' }}
      onError={() => setImgErr(true)}
    />
  )
}

export default function MobileHeader() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<MediaItem[]>([])
  const [isFetching, setIsFetching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [locationName, setLocationName] = useState<string | null>(null)
  const [showLocationToast, setShowLocationToast] = useState(false)
  const [history, setHistory] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const locationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Load search history
    try {
      const h = JSON.parse(localStorage.getItem('searchHistory') || '[]')
      setHistory(h)
    } catch {}

    // Use cached location; only fetch (and toast) when first detected
    const cached = localStorage.getItem('user_location')
    if (cached) {
      setLocationName(cached)
      return
    }

    fetch('https://ipapi.co/json/')
      .then(res => res.json())
      .then(data => {
        const name = data.country_name || 'Global'
        setLocationName(name)
        localStorage.setItem('user_location', name)
        // Only toast on first-ever detection; never repeat it
        if (!localStorage.getItem('user_location_seen')) {
          localStorage.setItem('user_location_seen', '1')
          setShowLocationToast(true)
          locationTimerRef.current = setTimeout(() => setShowLocationToast(false), 4000)
        }
      })
      .catch(() => setLocationName('Global'))

    return () => {
      if (locationTimerRef.current) clearTimeout(locationTimerRef.current)
    }
  }, [])

  const fetchSearchResults = useCallback(async () => {
    const q = query.trim()
    if (!q) { setResults([]); return }
    setIsFetching(true)
    try {
      const data = await searchMulti(q)
      setResults((data.results || []).filter(r => r.media_type !== 'person').slice(0, 5))
    } catch { /* ignore */ } finally { setIsFetching(false) }
  }, [query])

  useEffect(() => {
    const timer = setTimeout(fetchSearchResults, 300)
    return () => clearTimeout(timer)
  }, [fetchSearchResults])

  const submit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const q = query.trim()
    if (!q) return

    // Save to history
    try {
      const h = JSON.parse(localStorage.getItem('searchHistory') || '[]')
      const nextH = [q, ...h.filter((x: string) => x !== q)].slice(0, 10)
      localStorage.setItem('searchHistory', JSON.stringify(nextH))
      setHistory(nextH)
    } catch {}

    router.push(`/search?q=${encodeURIComponent(q)}`)
    setShowResults(false)
    setQuery('')
    inputRef.current?.blur()
  }

  return (
    <header className={styles.header}>
      {/* Top bar: logo + search */}
      <div className={styles.topBar}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoIcon}>🎬</span>
          <span className={styles.logoText}>
            Cinema<span className={styles.logoDot}>Phora</span>
          </span>
        </Link>

        <div className={styles.searchWrap}>
          <form onSubmit={submit} className={styles.searchForm}>
            <span className={styles.searchIcon}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </span>
            <input
              ref={inputRef}
              value={query}
              onChange={e => { setQuery(e.target.value); setShowResults(true) }}
              onFocus={() => setShowResults(true)}
              onBlur={() => setTimeout(() => setShowResults(false), 200)}
              placeholder="Search movies, TV shows…"
              className={styles.searchInput}
              id="mobile-search"
            />
            {query && (
              <button
                type="button"
                className={styles.clearBtn}
                onMouseDown={() => { setQuery(''); setResults([]) }}
              >✕</button>
            )}
          </form>

          {showResults && (
            <div className={styles.searchDropdown}>
              {/* Show history when query is empty */}
              {!query && history.length > 0 && (
                <>
                  <div className={styles.historyHeader}>Recent Searches</div>
                  <div className={styles.historyList}>
                    {history.map(item => (
                      <Link
                        key={item}
                        href={`/search?q=${encodeURIComponent(item)}`}
                        className={styles.historyItem}
                        onClick={() => { setShowResults(false); setQuery('') }}
                      >
                        <span className={styles.historyIcon}>🕒</span>
                        <span>{item}</span>
                      </Link>
                    ))}
                  </div>
                </>
              )}

              {/* Show results when query is not empty */}
              {query && results.map(item => (
                <Link
                  key={item.id}
                  href={`/details/${item.id}?type=${mediaType(item)}`}
                  className={styles.resultItem}
                  onClick={() => { setShowResults(false); setQuery('') }}
                >
                  <ResultThumb
                    src={posterUrl(item.poster_path, 'w92')}
                    alt={item.title || item.name || ''}
                    className={styles.resultThumb}
                  />
                  <div>
                    <div className={styles.resultTitle}>{item.title || item.name}</div>
                    <div className={styles.resultMeta}>
                      {item.media_type} · {(item.release_date || item.first_air_date || '').slice(0, 4)}
                    </div>
                  </div>
                </Link>
              ))}
              {query && results.length > 0 && (
                <button
                  className={styles.resultViewAll}
                  onMouseDown={() => submit()}
                >
                  See all results for &ldquo;{query}&rdquo; →
                </button>
              )}
              {query && results.length === 0 && !isFetching && (
                <div className={styles.resultEmpty}>No results found</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Horizontally scrollable category pills */}
      <nav className={styles.pillsNav} aria-label="Categories">
        {CATEGORIES.map(cat => {
          let active = false
          if (cat.href.includes('?')) {
            const [catPath, catQuery] = cat.href.split('?')
            if (pathname === catPath) {
              // Each key=value in the category link must be present in the current URL params
              const catParams = new URLSearchParams(catQuery)
              active = Array.from(catParams.entries()).every(
                ([k, v]) => searchParams.get(k) === v
              )
            }
          } else {
            active = cat.href === '/' ? pathname === '/' : pathname.startsWith(cat.href)
          }

          return (
            <Link
              key={cat.href}
              href={cat.href}
              className={`${styles.pill} ${active ? styles.pillActive : ''}`}
            >
              <span className={styles.pillIcon}>{cat.icon}</span>
              <span>{cat.label}</span>
            </Link>
          )
        })}
        {/* Dynamic Location Pill at the very end */}
        <button
          className={styles.pill}
          onClick={() => {
            localStorage.removeItem('user_location')
            setLocationName('Locating...')
            fetch('https://ipapi.co/json/')
              .then(res => res.json())
              .then(data => {
                const name = data.country_name || 'Global'
                setLocationName(name)
                localStorage.setItem('user_location', name)
              })
              .catch(() => setLocationName('Global'))
          }}
          title="Click to refresh location"
        >
          <span className={styles.pillIcon}>📍</span>
          <span>{locationName || 'Locating...'}</span>
        </button>
      </nav>

      {/* One-time location detected toast */}
      {showLocationToast && (
        <div style={{
          position: 'fixed',
          bottom: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--surface-raised)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '0.6rem 1.2rem',
          fontSize: '0.85rem',
          color: 'var(--text)',
          zIndex: 1000,
          whiteSpace: 'nowrap',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          animation: 'fadeIn 0.3s ease',
        }}>
          📍 Location detected: {locationName}
        </div>
      )}
    </header>
  )
}
