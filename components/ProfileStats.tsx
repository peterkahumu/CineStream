'use client'

import { useEffect, useState } from 'react'
import type { ActivityPoint, GenreTally } from '@/app/api/get-stats/route'
import ActivityLineChart from './ActivityLineChart'
import GenreDonutChart from './GenreDonutChart'
import styles from './ProfileStats.module.css'

const STATS_CACHE_KEY = 'cinemaphora_cached_profile_stats_v2'

interface Stats {
  titlesWatched: number
  titlesCompleted?: number
  moviesWatched: number
  tvShowsWatched: number
  completionRate: number
  totalWatchSeconds: number
  movieWatchSeconds?: number
  tvWatchSeconds?: number
  thisWeek: number
  thisMonth: number
  totalWatchEvents?: number
  activeStreak?: number
  peakDay?: { day: string; count: number }
  topGenres: GenreTally[]
  genresByRange?: {
    '7d'?: GenreTally[]
    '30d'?: GenreTally[]
    mtd?: GenreTally[]
    '90d'?: GenreTally[]
    all?: GenreTally[]
  }
  activity: ActivityPoint[]
  activitySeries?: ActivityPoint[]
}

function formatWatchTime(seconds: number): { primary: string; subtitle: string } {
  if (!seconds || seconds <= 0) return { primary: '0m', subtitle: 'No watch time' }
  const totalMinutes = Math.floor(seconds / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const days = Math.floor(hours / 24)

  if (days >= 1) {
    const remHours = hours % 24
    return {
      primary: `${days}d ${remHours}h`,
      subtitle: `${hours} total hours`,
    }
  }

  if (hours === 0) {
    return { primary: `${minutes}m`, subtitle: 'Minutes streamed' }
  }

  return {
    primary: `${hours}h ${minutes}m`,
    subtitle: `${totalMinutes} total minutes`,
  }
}

export default function ProfileStats() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // SWR Pattern: 1. Read from localStorage for instantaneous (0ms) render
    try {
      const cached = localStorage.getItem(STATS_CACHE_KEY)
      if (cached) {
        const parsed = JSON.parse(cached) as Stats
        setStats(parsed)
        setLoading(false)
      }
    } catch {
      // ignore JSON parse error
    }

    // 2. Fetch fresh data in the background from DB
    let isCancelled = false
    fetch('/api/get-stats')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load stats')
        return res.json()
      })
      .then((data: Stats) => {
        if (isCancelled) return
        setStats(data)
        setLoading(false)
        try {
          localStorage.setItem(STATS_CACHE_KEY, JSON.stringify(data))
        } catch {
          // ignore quota error
        }
      })
      .catch(err => {
        console.error('[ProfileStats] Failed to load stats:', err)
        if (isCancelled) return
        setLoading(false)
      })

    return () => {
      isCancelled = true
    }
  }, [])

  if (loading && !stats) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.metricsGrid}>
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className={`skeleton ${styles.tileSkeleton}`} />
          ))}
        </div>
        <div className={styles.visualsGrid}>
          <div className={`skeleton ${styles.chartSkeleton}`} />
          <div className={`skeleton ${styles.chartSkeleton}`} />
        </div>
      </div>
    )
  }

  if (!stats || stats.titlesWatched === 0) {
    return (
      <div className="empty-state">
        <div className="icon">📊</div>
        <h3>No stats yet</h3>
        <p>Start watching movies and TV shows and your personalized stats will appear here.</p>
      </div>
    )
  }

  const { primary: watchTimeText, subtitle: watchTimeSub } = formatWatchTime(stats.totalWatchSeconds)
  const movieRatio = stats.titlesWatched > 0 ? Math.round((stats.moviesWatched / stats.titlesWatched) * 100) : 0
  const completedCount = stats.titlesCompleted ?? Math.round((stats.completionRate / 100) * stats.titlesWatched)
  const activitySeries = stats.activitySeries || stats.activity || []

  return (
    <div className={styles.wrapper}>
      {/* Top Metric Cards */}
      <div className={styles.metricsGrid}>
        {/* Total Titles Watched */}
        <div className={styles.tile}>
          <div className={styles.tileHeader}>
            <span className={styles.tileLabel}>Titles Watched</span>
            <span className={styles.tileIcon}>🎬</span>
          </div>
          <div className={styles.tileValue}>{stats.titlesWatched}</div>
          <div className={styles.tileSubtitle}>
            <span>{stats.thisMonth} touched this month</span>
          </div>
        </div>

        {/* Total Watch Time */}
        <div className={styles.tile}>
          <div className={styles.tileHeader}>
            <span className={styles.tileLabel}>Total Watch Time</span>
            <span className={styles.tileIcon}>⏱️</span>
          </div>
          <div className={styles.tileValue}>{watchTimeText}</div>
          <div className={styles.tileSubtitle}>
            <span>{watchTimeSub}</span>
          </div>
        </div>

        {/* Movies vs TV Shows */}
        <div className={styles.tile}>
          <div className={styles.tileHeader}>
            <span className={styles.tileLabel}>Movies / TV Shows</span>
            <span className={styles.tileIcon}>🍿</span>
          </div>
          <div className={styles.tileValue}>
            {stats.moviesWatched} <span className={styles.tileSplit}>/ {stats.tvShowsWatched}</span>
          </div>
          <div className={styles.tileProgressTrack} title={`${movieRatio}% Movies, ${100 - movieRatio}% TV`}>
            <div
              className={`${styles.tileProgressFill} ${styles.tileProgressFillPrimary}`}
              style={{ width: `${movieRatio}%` }}
            />
            <div
              className={`${styles.tileProgressFill} ${styles.tileProgressFillSecondary}`}
              style={{ width: `${100 - movieRatio}%` }}
            />
          </div>
          <div className={styles.tileSubtitle}>
            <span>{movieRatio}% Movies · {100 - movieRatio}% TV Shows</span>
          </div>
        </div>

        {/* Completion Rate */}
        <div className={styles.tile}>
          <div className={styles.tileHeader}>
            <span className={styles.tileLabel}>
              Completion Rate{' '}
              <span
                className={styles.infoBadge}
                data-tooltip="Measures what percentage of started movies and TV series you've watched through to the end."
              >
                ?
              </span>
            </span>
            <span className={styles.tileIcon}>🎯</span>
          </div>
          <div className={styles.tileValue}>{stats.completionRate}%</div>
          <div className={styles.tileProgressTrack}>
            <div
              className={`${styles.tileProgressFill} ${styles.tileProgressFillSecondary}`}
              style={{ width: `${stats.completionRate}%` }}
            />
          </div>
          <div className={styles.tileSubtitle}>
            <span>{completedCount} of {stats.titlesWatched} completed</span>
          </div>
        </div>

        {/* Active Streak / Momentum */}
        <div className={styles.tile}>
          <div className={styles.tileHeader}>
            <span className={styles.tileLabel}>Momentum</span>
            <span className={styles.tileIcon}>🔥</span>
          </div>
          <div className={styles.tileValue}>
            {stats.activeStreak && stats.activeStreak > 0 ? `${stats.activeStreak} Days` : `${stats.thisWeek} This Wk`}
          </div>
          <div className={styles.tileSubtitle}>
            <span>
              {stats.activeStreak && stats.activeStreak > 0
                ? 'Active watching streak'
                : `${stats.thisWeek} titles in last 7 days`}
            </span>
          </div>
        </div>
      </div>

      {/* Visualisations Dashboard */}
      <div className={styles.visualsGrid}>
        <div className={styles.visualCard}>
          <ActivityLineChart activitySeries={activitySeries} />
        </div>
        <div className={styles.visualCard}>
          <GenreDonutChart genres={stats.topGenres} genresByRange={stats.genresByRange} />
        </div>
      </div>

      {/* Insights Ribbon */}
      {(stats.peakDay || stats.totalWatchEvents) && (
        <div className={styles.insightsRow}>
          {stats.peakDay && (
            <div className={insightCardStyle()}>
              <span className={styles.insightIcon}>📅</span>
              <div className={styles.insightText}>
                <h4 className={styles.insightTitle}>Peak Viewing Day: {stats.peakDay.day}s</h4>
                <p className={styles.insightDesc}>You watch the most content on {stats.peakDay.day}s</p>
              </div>
            </div>
          )}

          {stats.totalWatchEvents ? (
            <div className={insightCardStyle()}>
              <span className={styles.insightIcon}>🎞️</span>
              <div className={styles.insightText}>
                <h4 className={styles.insightTitle}>{stats.totalWatchEvents} Episodes & Movies Logged</h4>
                <p className={styles.insightDesc}>Synced in your history across all your devices</p>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

function insightCardStyle() {
  return styles.insightCard
}
