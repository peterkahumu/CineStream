'use client'

import styles from './MediaSplitCard.module.css'

interface Props {
  moviesWatched: number
  tvShowsWatched: number
  episodesWatched?: number
  movieWatchSeconds?: number
  tvWatchSeconds?: number
}

function formatShortDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0h 0m'
  const totalMinutes = Math.floor(seconds / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes}m`
  return `${hours}h ${minutes}m`
}

export default function MediaSplitCard({
  moviesWatched,
  tvShowsWatched,
  episodesWatched = 0,
  movieWatchSeconds = 0,
  tvWatchSeconds = 0,
}: Props) {
  const totalSeconds = movieWatchSeconds + tvWatchSeconds
  const moviePercent = totalSeconds > 0 ? Math.round((movieWatchSeconds / totalSeconds) * 100) : 50
  const tvPercent = 100 - moviePercent

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          <span>🍿</span> Movies vs. TV Series Breakdown
        </h3>
        <p className={styles.subtitle}>
          Comparative breakdown of your watch time across feature films and episodic series
        </p>
      </div>

      <div className={styles.splitGrid}>
        {/* Movies Card */}
        <div className={styles.splitCard}>
          <div className={styles.cardAccentMovie} />
          <div className={styles.cardTop}>
            <span className={styles.cardType}>Movies</span>
            <span className={styles.cardIcon}>🎬</span>
          </div>
          <div className={styles.cardValue}>{formatShortDuration(movieWatchSeconds)}</div>
          <div className={styles.cardDetails}>
            <span><strong>{moviesWatched}</strong> {moviesWatched === 1 ? 'Movie' : 'Movies'} Streamed</span>
            <span>{moviePercent}% of Total Watch Time</span>
          </div>
        </div>

        {/* TV Series Card */}
        <div className={styles.splitCard}>
          <div className={styles.cardAccentTv} />
          <div className={styles.cardTop}>
            <span className={styles.cardType}>TV Series</span>
            <span className={styles.cardIcon}>📺</span>
          </div>
          <div className={styles.cardValue}>{formatShortDuration(tvWatchSeconds)}</div>
          <div className={styles.cardDetails}>
            <span><strong>{tvShowsWatched}</strong> {tvShowsWatched === 1 ? 'Show' : 'Shows'} · <strong>{episodesWatched}</strong> Episodes</span>
            <span>{tvPercent}% of Total Watch Time</span>
          </div>
        </div>
      </div>

      {/* Visual Proportional Comparison Bar */}
      <div className={styles.comparisonBarContainer}>
        <div className={styles.comparisonLabels}>
          <span className={styles.labelMovie}>Movies: {moviePercent}% ({formatShortDuration(movieWatchSeconds)})</span>
          <span className={styles.labelTv}>TV Series: {tvPercent}% ({formatShortDuration(tvWatchSeconds)})</span>
        </div>
        <div className={styles.comparisonTrack} title={`Movies: ${moviePercent}%, TV: ${tvPercent}%`}>
          <div className={styles.fillMovie} style={{ width: `${moviePercent}%` }} />
          <div className={styles.fillTv} style={{ width: `${tvPercent}%` }} />
        </div>
      </div>
    </div>
  )
}
