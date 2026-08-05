'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { Genre } from '@/lib/tmdb'
import styles from './WatchHistoryList.module.css'

const HISTORY_CACHE_KEY = 'cinemaphora_cached_history_v2'
const PAGE_SIZE = 15

export interface HistoryEntry {
  id: string
  tmdbId: string
  mediaType: 'movie' | 'tv'
  title: string
  poster_path: string | null
  season?: number
  episode?: number
  event: 'started' | 'completed'
  genres?: Genre[] | null
  occurredAt: number
}

type FilterType = 'all' | 'movie' | 'tv' | 'completed' | 'started'

function formatRelativeTime(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7)
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatExactDate(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function watchHref(entry: HistoryEntry): string {
  const base = `/details/${entry.tmdbId}?type=${entry.mediaType}`
  if (entry.mediaType === 'tv' && entry.season != null && entry.episode != null) {
    return `${base}&tab=watch&s=${entry.season}&e=${entry.episode}`
  }
  return `${base}&tab=watch`
}

function detailsHref(entry: HistoryEntry): string {
  const base = `/details/${entry.tmdbId}?type=${entry.mediaType}`
  if (entry.mediaType === 'tv' && entry.season != null && entry.episode != null) {
    return `${base}&tab=watch&s=${entry.season}&e=${entry.episode}#media-tabs`
  }
  return base
}

export default function WatchHistoryList() {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)

  // SWR local storage cache + DB fetch
  useEffect(() => {
    // 1. Instant render from local storage
    if (page === 1 && filter === 'all') {
      try {
        const cached = localStorage.getItem(HISTORY_CACHE_KEY)
        if (cached) {
          const parsed = JSON.parse(cached) as { items: HistoryEntry[]; total: number }
          if (Array.isArray(parsed.items)) {
            setHistory(parsed.items)
            setTotal(parsed.total)
            setLoading(false)
          }
        }
      } catch {
        // ignore JSON parse error
      }
    }

    // 2. Fetch from database
    let cancelled = false
    const mediaParam = filter === 'movie' || filter === 'tv' ? `&type=${filter}` : ''
    fetch(`/api/get-history?page=${page}&pageSize=${PAGE_SIZE}${mediaParam}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load history')
        return res.json()
      })
      .then((data: { items: HistoryEntry[]; total: number }) => {
        if (cancelled) return
        const items = Array.isArray(data.items) ? data.items : []
        setHistory(items)
        setTotal(data.total ?? 0)
        setLoading(false)

        if (page === 1 && filter === 'all') {
          try {
            localStorage.setItem(HISTORY_CACHE_KEY, JSON.stringify(data))
          } catch {
            // ignore storage quota error
          }
        }
      })
      .catch(err => {
        console.error('[WatchHistoryList] Failed to load history:', err)
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [filter, page])

  // Count items by category for filter pills
  const counts = useMemo(() => {
    let movies = 0
    let tv = 0
    let completed = 0
    let started = 0

    history.forEach(item => {
      if (item.mediaType === 'movie') movies++
      else tv++
      if (item.event === 'completed') completed++
      else started++
    })

    return {
      all: total || history.length,
      movie: movies,
      tv,
      completed,
      started,
    }
  }, [history, total])

  // Filter items client-side for search and status filters
  const displayItems = useMemo(() => {
    return history.filter(item => {
      if (filter === 'completed' && item.event !== 'completed') return false
      if (filter === 'started' && item.event !== 'started') return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchesTitle = item.title.toLowerCase().includes(q)
        const matchesGenre = item.genres?.some(g => g.name.toLowerCase().includes(q))
        return matchesTitle || matchesGenre
      }
      return true
    })
  }, [history, filter, searchQuery])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const handleFilterChange = (f: FilterType) => {
    setLoading(true)
    setFilter(f)
    setPage(1)
  }

  const handlePageChange = (p: number) => {
    setLoading(true)
    setPage(p)
    window.scrollTo({ top: Math.max(0, window.scrollY - 300), behavior: 'smooth' })
  }

  return (
    <div className={styles.wrapper}>
      {/* Controls: Search and Filter Tabs */}
      <div className={styles.controlsBar}>
        <div className={styles.searchBox}>
          <span className={styles.searchIcon} aria-hidden="true">🔍</span>
          <input
            type="text"
            placeholder="Search history by title or genre…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
          {searchQuery && (
            <button
              type="button"
              className={styles.clearSearchBtn}
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        <div className={styles.filters} role="group" aria-label="Filter history">
          {(
            [
              { key: 'all', label: 'All', count: counts.all },
              { key: 'movie', label: 'Movies', count: counts.movie },
              { key: 'tv', label: 'TV Shows', count: counts.tv },
              { key: 'completed', label: 'Completed', count: counts.completed },
              { key: 'started', label: 'In Progress', count: counts.started },
            ] as { key: FilterType; label: string; count: number }[]
          ).map(f => (
            <button
              key={f.key}
              type="button"
              className={`${styles.filterBtn} ${filter === f.key ? styles.filterBtnActive : ''}`}
              onClick={() => handleFilterChange(f.key)}
            >
              <span>{f.label}</span>
              {f.count > 0 && <span className={styles.filterCount}>{f.count}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Results Header */}
      {!loading && (
        <div className={styles.resultsHeader}>
          <span>
            Showing {displayItems.length} {displayItems.length === 1 ? 'title' : 'titles'}
            {total > displayItems.length ? ` (of ${total} total)` : ''}
          </span>
          {totalPages > 1 && (
            <span>
              Page {page} of {totalPages}
            </span>
          )}
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && history.length === 0 ? (
        <div className={styles.list}>
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className={`skeleton ${styles.rowSkeleton}`} />
          ))}
        </div>
      ) : displayItems.length === 0 ? (
        <div className="empty-state">
          <div className="icon">🕘</div>
          <h3>{searchQuery ? 'No matching titles found' : 'No watch history yet'}</h3>
          <p>
            {searchQuery
              ? `No titles in your history match "${searchQuery}". Try a different search term.`
              : 'Titles you start or finish watching will automatically appear here.'}
          </p>
        </div>
      ) : (
        <>
          <ul className={styles.list}>
            {displayItems.map(entry => {
              const isTv = entry.mediaType === 'tv'
              const hasEp = isTv && entry.season != null && entry.episode != null
              const isCompleted = entry.event === 'completed'

              return (
                <li key={entry.id} className={styles.card}>
                  {/* Left Column: Poster + Info */}
                  <div className={styles.cardLeft}>
                    {/* Poster with hover play overlay */}
                    <Link href={watchHref(entry)} className={styles.posterWrap} title={`Play ${entry.title}`}>
                      {entry.poster_path ? (
                        <Image
                          src={`https://image.tmdb.org/t/p/w185${entry.poster_path}`}
                          alt={entry.title}
                          fill
                          sizes="64px"
                          className={styles.posterImg}
                        />
                      ) : (
                        <div className={styles.posterFallback}>{entry.title.charAt(0)}</div>
                      )}
                      <div className={styles.posterPlayOverlay} aria-hidden="true">
                        <span>▶</span>
                      </div>
                    </Link>

                    {/* Middle Info Column */}
                    <div className={styles.cardInfo}>
                      {/* Title and Badges */}
                      <div className={styles.titleRow}>
                        <Link href={detailsHref(entry)} className={styles.titleLink}>
                          {entry.title}
                        </Link>

                        <span className={styles.typeBadge}>{isTv ? 'TV Series' : 'Movie'}</span>

                        {hasEp && (
                          <span className={styles.episodeBadge}>
                            S{entry.season} · E{entry.episode}
                          </span>
                        )}
                      </div>

                      {/* Status and Genres */}
                      <div className={styles.metaRow}>
                        <span
                          className={`${styles.statusBadge} ${
                            isCompleted ? styles.statusCompleted : styles.statusStarted
                          }`}
                        >
                          {isCompleted ? '✓ Completed' : '▶ In Progress'}
                        </span>

                        {entry.genres && entry.genres.length > 0 && (
                          <div className={styles.genresList}>
                            {entry.genres.slice(0, 3).map(g => (
                              <span key={g.id} className={styles.genrePill}>
                                {g.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Timestamp Info */}
                      <div className={styles.timeRow}>
                        <span className={styles.timeIcon} aria-hidden="true">🕘</span>
                        <span className={styles.timeRelative}>{formatRelativeTime(entry.occurredAt)}</span>
                        <span>·</span>
                        <span title={formatExactDate(entry.occurredAt)}>
                          {formatExactDate(entry.occurredAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Actions */}
                  <div className={styles.cardActions}>
                    <Link href={watchHref(entry)} className={styles.resumeBtn} title="Play in player">
                      <span>▶</span>{' '}
                      {isCompleted
                        ? 'Watch Again'
                        : hasEp
                        ? `Resume S${entry.season} E${entry.episode}`
                        : 'Resume'}
                    </Link>

                    <Link href={detailsHref(entry)} className={styles.detailsBtn} title="View title details">
                      Details
                    </Link>
                  </div>
                </li>
              )
            })}
          </ul>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                type="button"
                className={styles.pageBtn}
                onClick={() => handlePageChange(Math.max(1, page - 1))}
                disabled={page === 1 || loading}
              >
                ← Previous
              </button>
              <span className={styles.pageInfo}>
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                className={styles.pageBtn}
                onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
                disabled={page === totalPages || loading}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
