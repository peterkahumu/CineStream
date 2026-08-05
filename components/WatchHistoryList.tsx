'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import styles from './WatchHistoryList.module.css'

interface HistoryEntry {
  id: string
  tmdbId: string
  mediaType: 'movie' | 'tv'
  title: string
  poster_path: string | null
  season?: number
  episode?: number
  event: 'started' | 'completed'
  occurredAt: number
}

type FilterType = 'all' | 'movie' | 'tv'

const PAGE_SIZE = 20

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays <= 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7)
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30)
    return months === 1 ? '1 month ago' : `${months} months ago`
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// For TV entries, deep-links straight into the episode that was watched —
// same `tab=watch&s=&e=` shape WatchClient's "Back to Details" link uses,
// which EpisodeSelector reads to highlight and smooth-scroll to that episode.
function historyHref(entry: HistoryEntry): string {
  const base = `/details/${entry.tmdbId}?type=${entry.mediaType}`
  if (entry.mediaType === 'tv' && entry.season != null && entry.episode != null) {
    return `${base}&tab=watch&s=${entry.season}&e=${entry.episode}`
  }
  return base
}

// ── Component ────────────────────────────────────────────────────────────────

export default function WatchHistoryList() {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')
  const [page, setPage] = useState(1)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/get-history?page=${page}&pageSize=${PAGE_SIZE}&type=${filter}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load history')
        return res.json()
      })
      .then((data: { items: HistoryEntry[]; total: number }) => {
        if (cancelled) return
        setHistory(Array.isArray(data.items) ? data.items : [])
        setTotal(data.total ?? 0)
      })
      .catch(err => console.error('[WatchHistoryList] Failed to load history:', err))
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [filter, page])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const changeFilter = (f: FilterType) => {
    setLoading(true)
    setFilter(f)
    setPage(1)
  }

  const changePage = (p: number) => {
    setLoading(true)
    setPage(p)
  }

  if (loading) {
    return (
      <div className={styles.list}>
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className={`skeleton ${styles.rowSkeleton}`} />
        ))}
      </div>
    )
  }

  return (
    <div>
      <div className={styles.filters}>
        {(['all', 'movie', 'tv'] as FilterType[]).map(f => (
          <button
            key={f}
            className={`${styles.filterBtn} ${filter === f ? styles.filterBtnActive : ''}`}
            onClick={() => changeFilter(f)}
          >
            {f === 'all' ? 'All' : f === 'movie' ? 'Movies' : 'TV Shows'}
          </button>
        ))}
      </div>

      {history.length === 0 ? (
        <div className="empty-state">
          <div className="icon">🕘</div>
          <h3>No history yet</h3>
          <p>Titles you start or finish watching will show up here.</p>
        </div>
      ) : (
        <>
          <ul className={styles.list}>
            {history.map(entry => (
              <li key={entry.id} className={styles.row}>
                <Link href={historyHref(entry)} className={styles.rowLink}>
                  <div className={styles.poster}>
                    {entry.poster_path ? (
                      <Image
                        src={`https://image.tmdb.org/t/p/w92${entry.poster_path}`}
                        alt={entry.title}
                        fill
                        sizes="46px"
                        className={styles.posterImg}
                      />
                    ) : (
                      <div className={styles.posterFallback}>{entry.title.charAt(0)}</div>
                    )}
                  </div>
                  <div className={styles.info}>
                    <p className={styles.title}>{entry.title}</p>
                    <p className={styles.meta}>
                      {entry.mediaType === 'tv' && entry.season != null && entry.episode != null && (
                        <span>S{entry.season} E{entry.episode} · </span>
                      )}
                      <span>{formatDate(entry.occurredAt)}</span>
                    </p>
                  </div>
                  <span className={`${styles.badge} ${entry.event === 'completed' ? styles.badgeCompleted : styles.badgeStarted}`}>
                    {entry.event === 'completed' ? '✓ Completed' : '▶ Started'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                className={styles.pageBtn}
                onClick={() => changePage(Math.max(1, page - 1))}
                disabled={page === 1}
              >
                ← Previous
              </button>
              <span className={styles.pageInfo}>Page {page} of {totalPages}</span>
              <button
                className={styles.pageBtn}
                onClick={() => changePage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
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
