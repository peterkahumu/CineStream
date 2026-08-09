'use client'

import { useEffect, useState, useCallback } from 'react'
import type {
  ActivityPoint,
  GenreTally,
  TopTitleStat,
  BingeMetrics,
} from '@/app/api/get-stats/route'
import { flushProgress, flushHistoryEvents, PROGRESS_SYNC_EVENT } from '@/lib/progressTracker'
import ActivityLineChart from './ActivityLineChart'
import GenreDonutChart from './GenreDonutChart'
import MediaSplitCard from './MediaSplitCard'
import TopStreamedCard from './TopStreamedCard'
import styles from './ProfileStats.module.css'

const STATS_CACHE_KEY = 'cinemaphora_cached_profile_stats_v5'

interface Stats {
  titlesWatched: number
  titlesCompleted?: number
  completedMoviesCount?: number
  completedEpisodesCount?: number
  totalStartedItems?: number
  moviesWatched: number
  tvShowsWatched: number
  episodesWatched?: number
  completionRate: number
  totalWatchSeconds: number
  movieWatchSeconds?: number
  tvWatchSeconds?: number
  thisWeek: number
  thisMonth: number
  totalWatchEvents?: number
  activeStreak?: number
  topTitles?: TopTitleStat[]
  bingeMetrics?: BingeMetrics
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
  updatedAt?: number
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
      subtitle: `${hours} total hours (${totalMinutes.toLocaleString()} mins)`,
    }
  }

  if (hours === 0) {
    return { primary: `${minutes}m`, subtitle: 'Minutes streamed' }
  }

  return {
    primary: `${hours}h ${minutes}m`,
    subtitle: `${totalMinutes.toLocaleString()} total minutes`,
  }
}

function formatLastUpdated(timestamp?: number): string {
  if (!timestamp) return 'Just now'
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' })
}

export default function ProfileStats() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null)

  const fetchFreshStats = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true)

    // Flush any pending un-synced progress & history events from active playback
    flushProgress()
    flushHistoryEvents()

    try {
      const res = await fetch('/api/get-stats', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      })
      if (!res.ok) throw new Error('Failed to load stats')
      const data: Stats = await res.json()
      setStats(data)
      setLastSyncTime(data.updatedAt || Date.now())
      setLoading(false)
      try {
        localStorage.setItem(STATS_CACHE_KEY, JSON.stringify(data))
      } catch {
        // ignore quota error
      }
    } catch (err) {
      console.error('[ProfileStats] Failed to load stats:', err)
      setLoading(false)
    } finally {
      if (isManual) setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    // 1. Read from localStorage for instantaneous (0ms) render
    try {
      const cached = localStorage.getItem(STATS_CACHE_KEY)
      if (cached) {
        const parsed = JSON.parse(cached) as Stats
        setStats(parsed)
        setLastSyncTime(parsed.updatedAt || null)
        setLoading(false)
      }
    } catch {
      // ignore JSON parse error
    }

    // 2. Fetch fresh data from DB
    fetchFreshStats()

    // 3. Listen for real-time progress sync and window focus events
    const handleSyncEvent = () => {
      fetchFreshStats()
    }

    const handleFocus = () => {
      fetchFreshStats()
    }

    window.addEventListener(PROGRESS_SYNC_EVENT, handleSyncEvent)
    window.addEventListener('focus', handleFocus)

    return () => {
      window.removeEventListener(PROGRESS_SYNC_EVENT, handleSyncEvent)
      window.removeEventListener('focus', handleFocus)
    }
  }, [fetchFreshStats])

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
        <button
          type="button"
          onClick={() => fetchFreshStats(true)}
          disabled={refreshing}
          className={styles.refreshBtn}
          style={{ marginTop: '12px' }}
        >
          <span className={`${styles.refreshIcon} ${refreshing ? styles.spinning : ''}`}>🔄</span>
          <span>{refreshing ? 'Syncing...' : 'Check Again'}</span>
        </button>
      </div>
    )
  }

  const { primary: watchTimeText, subtitle: watchTimeSub } = formatWatchTime(stats.totalWatchSeconds)
  const movieRatio = stats.titlesWatched > 0 ? Math.round((stats.moviesWatched / stats.titlesWatched) * 100) : 0
  
  // Accurate completion counts
  const totalCompleted = stats.titlesCompleted ?? ((stats.completedMoviesCount ?? 0) + (stats.completedEpisodesCount ?? 0))
  const completedMovies = stats.completedMoviesCount ?? 0
  const completedEpisodes = stats.completedEpisodesCount ?? 0
  
  let completionSubtitle = 'No titles finished yet (watched ≥ 90%)'
  if (totalCompleted > 0) {
    if (completedMovies > 0 && completedEpisodes > 0) {
      completionSubtitle = `${completedMovies} mov · ${completedEpisodes} ep finished`
    } else if (completedMovies > 0) {
      completionSubtitle = `${completedMovies} ${completedMovies === 1 ? 'movie' : 'movies'} finished`
    } else {
      completionSubtitle = `${completedEpisodes} ${completedEpisodes === 1 ? 'episode' : 'episodes'} finished`
    }
  }

  const activitySeries = stats.activitySeries || stats.activity || []
  const episodesCount = stats.episodesWatched ?? 0
  const topBinge = stats.bingeMetrics?.topBingeTitle

  return (
    <div className={styles.wrapper}>
      {/* Real-time Status & Manual Refresh Toolbar */}
      <div className={styles.statsToolbar}>
        <div className={styles.lastUpdatedInfo}>
          <span className={styles.liveDot} aria-hidden="true" />
          <span>
            Live database sync {lastSyncTime ? `· Updated ${formatLastUpdated(lastSyncTime)}` : ''}
          </span>
        </div>

        <button
          type="button"
          className={styles.refreshBtn}
          onClick={() => fetchFreshStats(true)}
          disabled={refreshing}
          title="Force fresh sync from database"
        >
          <span className={`${styles.refreshIcon} ${refreshing ? styles.spinning : ''}`} aria-hidden="true">
            🔄
          </span>
          <span>{refreshing ? 'Refreshing…' : 'Refresh Stats'}</span>
        </button>
      </div>

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
            <span>{stats.thisMonth} active this month</span>
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
            <span>{episodesCount > 0 ? `${episodesCount} episodes logged` : `${movieRatio}% Movies · ${100 - movieRatio}% TV`}</span>
          </div>
        </div>

        {/* Completion Rate */}
        <div className={styles.tile}>
          <div className={styles.tileHeader}>
            <span className={styles.tileLabel}>
              Completion Rate{' '}
              <span
                className={styles.infoBadge}
                data-tooltip="Measures what percentage of started movies and TV episodes you've watched to 90%+ completion."
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
            <span>{completionSubtitle}</span>
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

      {/* Visualisations Dashboard Grid */}
      <div className={styles.visualsGrid}>
        {/* 1. Top Streamed Titles Leaderboard */}
        <div className={styles.visualCard}>
          <TopStreamedCard topTitles={stats.topTitles} />
        </div>

        {/* 2. Viewing Activity Timeline */}
        <div className={styles.visualCard}>
          <ActivityLineChart activitySeries={activitySeries} />
        </div>

        {/* 3. Top Genres Donut */}
        <div className={styles.visualCard}>
          <GenreDonutChart genres={stats.topGenres} genresByRange={stats.genresByRange} />
        </div>

        {/* 4. Movies vs TV Breakdown */}
        <div className={styles.visualCard}>
          <MediaSplitCard
            moviesWatched={stats.moviesWatched}
            tvShowsWatched={stats.tvShowsWatched}
            episodesWatched={stats.episodesWatched}
            movieWatchSeconds={stats.movieWatchSeconds}
            tvWatchSeconds={stats.tvWatchSeconds}
          />
        </div>
      </div>

      {/* Insights Ribbon */}
      {(topBinge || stats.totalWatchEvents || stats.bingeMetrics?.avgEpisodeMinutes) && (
        <div className={styles.insightsRow}>
          {topBinge && (
            <div className={styles.insightCard}>
              <span className={styles.insightIcon}>🔥</span>
              <div className={styles.insightText}>
                <h4 className={styles.insightTitle}>Top Binge: {topBinge.title}</h4>
                <p className={styles.insightDesc}>
                  {topBinge.episodesCount} episodes watched ({formatWatchTime(topBinge.watchSeconds).primary})
                </p>
              </div>
            </div>
          )}

          {stats.bingeMetrics?.avgEpisodeMinutes ? (
            <div className={styles.insightCard}>
              <span className={styles.insightIcon}>⏱️</span>
              <div className={styles.insightText}>
                <h4 className={styles.insightTitle}>Avg Episode Duration</h4>
                <p className={styles.insightDesc}>~{stats.bingeMetrics.avgEpisodeMinutes} minutes per episode streamed</p>
              </div>
            </div>
          ) : null}

          {stats.totalWatchEvents ? (
            <div className={styles.insightCard}>
              <span className={styles.insightIcon}>🎞️</span>
              <div className={styles.insightText}>
                <h4 className={styles.insightTitle}>{stats.totalWatchEvents} Total Events Logged</h4>
                <p className={styles.insightDesc}>Synced across all your devices in real time</p>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
