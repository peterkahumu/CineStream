'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useRef, useEffect, useCallback } from 'react'
import styles from './Navbar.module.css'

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

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
              onBlur={() => { if (!query) setSearchOpen(false) }}
            />
            {query && (
              <button type="submit" className={styles.searchSubmit} aria-label="Search">⏎</button>
            )}
          </form>

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
          <form onSubmit={submit} className={styles.mobileSearch}>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search…"
              className={styles.searchInput}
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', flexShrink: 0 }}>Go</button>
          </form>
        </div>
      )}
    </nav>
  )
}
