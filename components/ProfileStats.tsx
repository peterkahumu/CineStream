'use client'

import { useEffect, useState } from 'react'
import styles from './ProfileStats.module.css'

interface GenreTally {
  id: number
  name: string
  count: number
}

interface ActivityDay {
  date: string
  count: number
}

interface Stats {
  titlesWatched: number
  moviesWatched: number
  tvShowsWatched: number
  completionRate: number
  totalWatchSeconds: number
  thisWeek: number
  thisMonth: number
  topGenres: GenreTally[]
  activity: ActivityDay[]
}

// Helpers

function formatWatchTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours === 0) return `${minutes}m`
  return `${hours}h ${minutes}m`
}

/** Rounds a 0–100 percentage to the nearest 10% bucket (static CSS-module classes, no inline styles). */
function bucket(pct: number): number {
  return Math.min(100, Math.max(0, Math.round(pct / 10) * 10))
}

function barWidthClass(pct: number): string {
  return styles[`p${bucket(pct)}`]
}

function barHeightClass(pct: number): string {
  return styles[`h${bucket(pct)}`]
}

function dayLabel(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short' })
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
        {Array.from({ length: 5 }, (_, i) => (
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
  const maxActivityCount = Math.max(1, ...stats.activity.map(d => d.count))
  const hasActivity = stats.activity.some(d => d.count > 0)

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
          <span className={styles.tileLabel}>Titles This Week</span>
        </div>
        <div className={styles.tile}>
          <span className={styles.tileValue}>{stats.completionRate}%</span>
          <span className={styles.tileLabel}>Completion Rate</span>
        </div>
      </div>

      {hasActivity && (
        <div className={styles.genresCard}>
          <h3 className={styles.genresTitle}>Last 7 Days</h3>
          <div className={styles.activityChart}>
            {stats.activity.map(day => {
              const pct = Math.round((day.count / maxActivityCount) * 100)
              return (
                <div
                  key={day.date}
                  className={styles.activityCol}
                  title={`${day.count} title${day.count === 1 ? '' : 's'} on ${day.date}`}
                >
                  <span className={styles.activityCount}>{day.count > 0 ? day.count : ''}</span>
                  <div className={styles.activityBarTrack}>
                    <div className={`${styles.activityBarFill} ${barHeightClass(pct)}`} />
                  </div>
                  <span className={styles.activityDayLabel}>{dayLabel(day.date)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

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
