'use client'
import { useRouter } from 'next/navigation'
import { Season, Episode } from '@/lib/tmdb'
import styles from './EpisodeSelector.module.css'

interface Props {
  seasons: Season[]
  tvId: number
  activeSeason: number
  activeEpisode: number
  episodes: Episode[]
}

export default function EpisodeSelector({ seasons, tvId, activeSeason, activeEpisode, episodes }: Props) {
  const router = useRouter()

  const handleSeasonChange = (newSeason: number) => {
    // Navigate to new season — server component will re-fetch episode data
    router.push(`/watch/${tvId}?type=tv&s=${newSeason}&e=1`)
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.heading}>Episodes</h3>
        <select
          className={styles.seasonSelect}
          value={activeSeason}
          onChange={e => handleSeasonChange(Number(e.target.value))}
        >
          {seasons.map(s => (
            <option key={s.season_number} value={s.season_number}>
              Season {s.season_number}
              {s.episode_count ? ` · ${s.episode_count} eps` : ''}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.episodeList}>
        {episodes.map(ep => {
          const isActive = ep.episode_number === activeEpisode
          return (
            <button
              key={ep.id}
              className={`${styles.episode} ${isActive ? styles.active : ''}`}
              onClick={() => router.replace(`/watch/${tvId}?type=tv&s=${activeSeason}&e=${ep.episode_number}`, { scroll: false })}
            >
              <div className={styles.epNum}>
                {isActive ? '▶' : ep.episode_number}
              </div>
              <div className={styles.epInfo}>
                <div className={styles.epTitle}>{ep.name || `Episode ${ep.episode_number}`}</div>
                {ep.air_date && (
                  <div className={styles.epDate}>{ep.air_date.slice(0, 4)}</div>
                )}
              </div>
              {ep.vote_average > 0 && (
                <div className={styles.epRating}>★ {ep.vote_average.toFixed(1)}</div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
