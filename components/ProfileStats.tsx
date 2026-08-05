'use client'

import { useEffect, useState } from 'react'
import styles from './ProfileStats.module.css'

interface GenreTally {
  id: number
  name: string
  count: number
}

interface Stats {
  titlesWatched: number
  moviesWatched: number
  tvShowsWatched: number
  completedCount: number
  totalWatchSeconds: number
  thisWeek: number
  thisMonth: number
  topGenres: GenreTally[]
}

// Helpers

function formatWatchTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours === 0) return `${minutes}m`
  return `${hours}h ${minutes}m`
}

/** Maps a 0–100 percentage to a static CSS-module width class (10% buckets, no inline styles). */
function barWidthClass(pct: number): string {
  const bucket = Math.min(100, Math.max(0, Math.round(pct / 10) * 10))
  return styles[`p${bucket}`]
}

async function loadStats(
  setStats: (s: Stats | null) => void,
  setLoading: (v: boolean) => void
) {
  try {
    const res = await fetch('/api/get-stats')
    if (!res.ok) throw new Error('Failed to load stats')
    setStats((await res.json()) as Stats)
  } catch (err) {
    console.error('[ProfileStats] Failed to load stats:', err)
  } finally {
    setLoading(false)
  }
}

// Component

export default function ProfileStats() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats(setStats, setLoading)
  }, [])

  if (loading) {
    return (
      <div className={styles.grid}>
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className={`skeleton ${styles.tileSkeleton}`} />
        ))}
      </div>
    )
  }

  if (!stats || stats.titlesWatched === 0) {
    return (
      <div className="empty-state">
        <div className="icon">📊</div>
        <h3>No stats yet</h3>
        <p>Start watching something and your stats will show up here.</p>
      </div>
    )
  }

  const maxGenreCount = stats.topGenres[0]?.count ?? 1

  return (
    <div className={styles.wrapper}>
      <div className={styles.grid}>
        <div className={styles.tile}>
          <span className={styles.tileValue}>{stats.titlesWatched}</span>
          <span className={styles.tileLabel}>Titles Watched</span>
        </div>
        <div className={styles.tile}>
          <span className={styles.tileValue}>{formatWatchTime(stats.totalWatchSeconds)}</span>
          <span className={styles.tileLabel}>Total Watch Time</span>
        </div>
        <div className={styles.tile}>
          <span className={styles.tileValue}>
            {stats.moviesWatched}<span className={styles.tileSplit}> / {stats.tvShowsWatched}</span>
          </span>
          <span className={styles.tileLabel}>Movies / TV Shows</span>
        </div>
        <div className={styles.tile}>
          <span className={styles.tileValue}>{stats.thisWeek}</span>
          <span className={styles.tileLabel}>This Week</span>
        </div>
      </div>

      {stats.topGenres.length > 0 && (
        <div className={styles.genresCard}>
          <h3 className={styles.genresTitle}>Top Genres</h3>
          <ul className={styles.genresList}>
            {stats.topGenres.map(genre => {
              const pct = Math.round((genre.count / maxGenreCount) * 100)
              return (
                <li key={genre.id} className={styles.genreRow}>
                  <span className={styles.genreName}>{genre.name}</span>
                  <div className={styles.genreBarTrack}>
                    <div className={`${styles.genreBarFill} ${barWidthClass(pct)}`} />
                  </div>
                  <span className={styles.genreCount}>{genre.count}</span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
