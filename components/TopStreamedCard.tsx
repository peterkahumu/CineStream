'use client'

import Image from 'next/image'
import type { TopTitleStat } from '@/app/api/get-stats/route'
import styles from './TopStreamedCard.module.css'

interface Props {
  topTitles?: TopTitleStat[]
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0m'
  const totalMinutes = Math.floor(seconds / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes}m`
  return `${hours}h ${minutes > 0 ? `${minutes}m` : ''}`
}

export default function TopStreamedCard({ topTitles = [] }: Props) {
  if (topTitles.length === 0) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <h3 className={styles.title}>
            <span>🏆</span> Top Streamed Titles
          </h3>
          <p className={styles.subtitle}>Your most-watched movies and series ranked by streaming time</p>
        </div>
        <div className={styles.emptyState}>
          <p>No watched titles recorded yet. Stream content to see your leaderboard!</p>
        </div>
      </div>
    )
  }

  const maxSeconds = topTitles[0]?.watchSeconds || 1

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          <span>🏆</span> Top Streamed Titles
        </h3>
        <p className={styles.subtitle}>Your most-watched movies and series ranked by streaming time</p>
      </div>

      <div className={styles.list}>
        {topTitles.map((item, index) => {
          const rank = index + 1
          const rankClass =
            rank === 1
              ? styles.rank1
              : rank === 2
              ? styles.rank2
              : rank === 3
              ? styles.rank3
              : styles.rankDefault

          const posterUrl = item.poster_path
            ? item.poster_path.startsWith('http')
              ? item.poster_path
              : `https://image.tmdb.org/t/p/w185${item.poster_path}`
            : null

          const genreNames = item.genres?.slice(0, 2).map((g) => g.name).join(' · ')
          const progressPercent = Math.max(8, Math.round((item.watchSeconds / maxSeconds) * 100))

          return (
            <div key={`${item.mediaType}-${item.tmdbId}`} className={styles.itemCard}>
              <div className={`${styles.rankBadge} ${rankClass}`}>#{rank}</div>

              <div className={styles.posterWrapper}>
                {posterUrl ? (
                  <Image
                    src={posterUrl}
                    alt={item.title}
                    fill
                    sizes="44px"
                    className={styles.posterImg}
                    unoptimized
                  />
                ) : (
                  <div className={styles.posterFallback}>
                    {item.mediaType === 'movie' ? '🎬' : '📺'}
                  </div>
                )}
              </div>

              <div className={styles.contentCol}>
                <div className={styles.titleRow}>
                  <span className={styles.itemTitle} title={item.title}>
                    {item.title}
                  </span>
                  <span className={styles.watchTime}>{formatDuration(item.watchSeconds)}</span>
                </div>

                <div className={styles.metaRow}>
                  <span className={styles.mediaBadge}>
                    {item.mediaType === 'movie' ? 'Movie' : 'TV Series'}
                  </span>
                  {item.mediaType === 'tv' && item.episodesCount > 0 && (
                    <span>
                      {item.episodesCount} {item.episodesCount === 1 ? 'episode' : 'episodes'}
                    </span>
                  )}
                  {genreNames && <span className={styles.genreTag}>• {genreNames}</span>}
                </div>

                <div className={styles.progressTrack} title={`${item.percentageOfTotal}% of total watch time`}>
                  <div className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
