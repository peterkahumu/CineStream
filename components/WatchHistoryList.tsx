'use client'

import { useEffect, useState, useMemo } from 'react'
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
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

async function loadHistory(
  setHistory: (items: HistoryEntry[]) => void,
  setLoading: (v: boolean) => void
) {
  try {
    const res = await fetch('/api/get-history')
    if (!res.ok) throw new Error('Failed to load history')
    const data = await res.json()
    if (Array.isArray(data)) setHistory(data as HistoryEntry[])
  } catch (err) {
    console.error('[WatchHistoryList] Failed to load history:', err)
  } finally {
    setLoading(false)
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export default function WatchHistoryList() {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  useEffect(() => {
    loadHistory(setHistory, setLoading)
  }, [])

  const filtered = useMemo(
    () => (filter === 'all' ? history : history.filter(h => h.mediaType === filter)),
    [history, filter]
  )
  const visible = filtered.slice(0, visibleCount)

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
            onClick={() => { setFilter(f); setVisibleCount(PAGE_SIZE) }}
          >
            {f === 'all' ? 'All' : f === 'movie' ? 'Movies' : 'TV Shows'}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="icon">🕘</div>
          <h3>No history yet</h3>
          <p>Titles you start or finish watching will show up here.</p>
        </div>
      ) : (
        <>
          <ul className={styles.list}>
            {visible.map(entry => (
              <li key={entry.id} className={styles.row}>
                <Link href={`/details/${entry.tmdbId}?type=${entry.mediaType}`} className={styles.rowLink}>
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

          {visibleCount < filtered.length && (
            <button className={styles.loadMoreBtn} onClick={() => setVisibleCount(c => c + PAGE_SIZE)}>
              Show more
            </button>
          )}
        </>
      )}
    </div>
  )
}
