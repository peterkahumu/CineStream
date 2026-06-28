'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useRef, useEffect, useCallback } from 'react'
import { searchMulti, MediaItem, posterUrl, mediaType } from '@/lib/tmdb'
import styles from './Navbar.module.css'

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<MediaItem[]>([])
  const [isFetching, setIsFetching] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const fetchSearchResults = useCallback(async () => {
    const q = query.trim()
    if (!q) {
      setResults([])
      return
    }
    setIsFetching(true)
    try {
      const data = await searchMulti(q)
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
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleKeyGlobal = useCallback((e: KeyboardEvent) => {
    if (e.key === '/' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
      e.preventDefault()
      setSearchOpen(true)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
    if (e.key === 'Escape') { setSearchOpen(false); setQuery('') }
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyGlobal)
    return () => window.removeEventListener('keydown', handleKeyGlobal)
  }, [handleKeyGlobal])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    router.push(`/search?q=${encodeURIComponent(query.trim())}`)
    setSearchOpen(false)
    setQuery('')
    setMenuOpen(false)
  }

  const navLinks = [
    { href: '/', label: 'Home', icon: '🏠' },
    { href: '/discover', label: 'Discover', icon: '🧭' },
    { href: '/search', label: 'Search', icon: '🔍' },
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
          {navLinks.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className={`${styles.link} ${pathname === l.href ? styles.active : ''}`}
            >
              {l.label}
            </Link>
          ))}
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
                    href={`/watch/${item.id}?type=${mediaType(item)}`} 
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
            onClick={() => { setSearchOpen(s => !s); setTimeout(() => inputRef.current?.focus(), 50) }}
            aria-label="Search"
          >
            🔍
            {!searchOpen && <span className={styles.kbdHint}>/</span>}
          </button>

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

      {/* Mobile menu */}
      {menuOpen && (
        <div className={styles.mobileMenu}>
          {navLinks.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className={`${styles.mobileLink} ${pathname === l.href ? styles.active : ''}`}
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
