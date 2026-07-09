'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useRef, useEffect, useCallback } from 'react'
import { searchMulti, MediaItem, posterUrl, mediaType } from '@/lib/tmdb'
import { useSettings } from '@/components/SettingsProvider'
import styles from './Navbar.module.css'

function handleScrolled(setScrolled: (v: boolean) => void) {
  setScrolled(window.scrollY > 10)
}

const CATEGORY_LINKS = [
  { href: '/trending',    label: 'Trending',       icon: '🔥' },
  { href: '/popular',     label: 'Popular',         icon: '🎞️' },
  { href: '/top-rated',   label: 'Top Rated',       icon: '⭐' },
  { href: '/now-playing', label: 'Now Playing',     icon: '🎬' },
  { href: '/upcoming',    label: 'Coming Soon',     icon: '🍿' },
  { href: '/providers',   label: 'Providers',       icon: '📺' },
  { href: '/discover',    label: 'Discover',        icon: '🧭' },
]

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { settings } = useSettings()
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<MediaItem[]>([])
  const [isFetching, setIsFetching] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [categoriesOpen, setCategoriesOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const categoriesRef = useRef<HTMLDivElement>(null)

  const fetchSearchResults = useCallback(async () => {
    const q = query.trim()
    if (!q) {
      setResults([])
      return
    }
    setIsFetching(true)
    try {
      const data = await searchMulti(q, 1, !settings.safeSearch)
      setResults((data.results || []).filter(r => r.media_type !== 'person').slice(0, 5))
    } catch (err) {
      console.error(err)
    } finally {
      setIsFetching(false)
    }
  }, [query])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSearchResults()
    }, 300)
    return () => clearTimeout(timer)
  }, [fetchSearchResults])

  useEffect(() => {
    const onScroll = () => handleScrolled(setScrolled)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close categories dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (categoriesRef.current && !categoriesRef.current.contains(e.target as Node)) {
        setCategoriesOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleKeyGlobal = useCallback((e: KeyboardEvent) => {
    if (e.key === '/' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
      e.preventDefault()
      setSearchOpen(true)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
    if (e.key === 'Escape') { setSearchOpen(false); setQuery(''); setCategoriesOpen(false) }
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyGlobal)
    return () => window.removeEventListener('keydown', handleKeyGlobal)
  }, [handleKeyGlobal])

  const submit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!query.trim()) return
    router.push(`/search?q=${encodeURIComponent(query.trim())}`)
    setSearchOpen(false)
    setMenuOpen(false)
  }

  const primaryLinks = [
    { href: '/', label: 'Home' },
    { href: '/search', label: 'Search' },
    { href: '/wishlist', label: 'My List' },
  ]

  return (
    <nav className={`${styles.nav} ${scrolled ? styles.scrolled : ''}`}>
      <div className={styles.inner}>
        {/* Logo */}
        <Link href="/" className={styles.logo} onClick={() => setMenuOpen(false)}>
          <span className={styles.logoIcon}>🎬</span>
          <span className={styles.logoText}>
            Cinema<span className={styles.logoDot}>Phora</span>
          </span>
        </Link>

        {/* Desktop links */}
        <div className={styles.links}>
          {primaryLinks.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className={`${styles.link} ${pathname === l.href ? styles.active : ''}`}
            >
              {l.label}
            </Link>
          ))}

          {/* Categories dropdown */}
          <div className={styles.categoriesWrapper} ref={categoriesRef}>
            <button
              className={`${styles.link} ${styles.categoriesBtn} ${CATEGORY_LINKS.some(l => pathname.startsWith(l.href)) ? styles.active : ''}`}
              onClick={() => setCategoriesOpen(o => !o)}
              aria-expanded={categoriesOpen}
            >
              Browse
              <svg
                className={`${styles.chevron} ${categoriesOpen ? styles.chevronOpen : ''}`}
                width="12" height="12" viewBox="0 0 12 12"
                fill="none" stroke="currentColor" strokeWidth="2"
              >
                <path d="M2 4l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {categoriesOpen && (
              <div className={styles.categoriesDropdown}>
                {CATEGORY_LINKS.map(l => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={`${styles.categoryItem} ${pathname.startsWith(l.href) && l.href !== '/' ? styles.active : ''}`}
                    onClick={() => setCategoriesOpen(false)}
                  >
                    <span>{l.icon}</span>
                    <span>{l.label}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right controls */}
        <div className={styles.controls}>
          <div className={styles.searchContainer}>
            <form
              onSubmit={submit}
              className={`${styles.searchForm} ${searchOpen ? styles.searchOpen : ''}`}
            >
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search movies, TV shows…"
                className={styles.searchInput}
                onBlur={() => { setTimeout(() => { if (!query) setSearchOpen(false) }, 200) }}
              />
              {query && (
                <button type="submit" className={styles.searchSubmit} aria-label="Search">⏎</button>
              )}
            </form>
            
            {searchOpen && query && (
              <div className={styles.searchResults}>
                {results.map(item => (
                  <Link 
                    key={item.id} 
                    href={`/details/${item.id}?type=${mediaType(item)}`} 
                    className={styles.searchResultItem}
                    onClick={() => { setSearchOpen(false); setQuery(''); setMenuOpen(false) }}
                  >
                    <img src={posterUrl(item.poster_path, 'w92') || 'https://via.placeholder.com/40x60?text=No+Image'} alt={item.title || item.name} />
                    <div>
                      <div className={styles.searchResultTitle}>{item.title || item.name}</div>
                      <div className={styles.searchResultMeta}>
                        {item.media_type} • {(item.release_date || item.first_air_date || '').slice(0,4)}
                      </div>
                    </div>
                  </Link>
                ))}
                {results.length > 0 && (
                  <Link 
                    href={`/search?q=${encodeURIComponent(query)}`} 
                    className={styles.searchResultMore}
                    onClick={() => { setSearchOpen(false); setQuery(''); setMenuOpen(false) }}
                  >
                    View all results
                  </Link>
                )}
                {results.length === 0 && !isFetching && (
                  <div className={styles.searchResultEmpty}>No results found.</div>
                )}
              </div>
            )}
          </div>

          <button
            className={styles.iconBtn}
            onClick={() => { 
              if (searchOpen && query.trim()) {
                submit()
              } else {
                setSearchOpen(s => !s)
                setTimeout(() => inputRef.current?.focus(), 50)
              }
            }}
            aria-label="Search"
          >
            🔍
            {!searchOpen && <span className={styles.kbdHint}>/</span>}
          </button>

          <Link
            href="/settings"
            className={styles.iconBtn}
            aria-label="Settings"
            title="Settings"
          >
            ⚙️
          </Link>

          {/* Hamburger (mobile) */}
          <button
            className={`${styles.iconBtn} ${styles.hamburger}`}
            onClick={() => setMenuOpen(m => !m)}
            aria-label="Menu"
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile menu — full category list */}
      {menuOpen && (
        <div className={styles.mobileMenu}>
          <Link
            href="/"
            className={`${styles.mobileLink} ${pathname === '/' ? styles.active : ''}`}
            onClick={() => setMenuOpen(false)}
          >
            <span>🏠</span> Home
          </Link>
          <Link
            href="/search"
            className={`${styles.mobileLink} ${pathname === '/search' ? styles.active : ''}`}
            onClick={() => setMenuOpen(false)}
          >
            <span>🔍</span> Search
          </Link>
          <Link
            href="/wishlist"
            className={`${styles.mobileLink} ${pathname === '/wishlist' ? styles.active : ''}`}
            onClick={() => setMenuOpen(false)}
          >
            <span>💖</span> My List
          </Link>

          <div className={styles.mobileSectionLabel}>Browse</div>

          {CATEGORY_LINKS.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className={`${styles.mobileLink} ${pathname.startsWith(l.href) ? styles.active : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              <span>{l.icon}</span> {l.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  )
}
