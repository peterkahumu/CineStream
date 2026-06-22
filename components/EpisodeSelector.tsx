'use client'
import { useState, useEffect } from 'react'
import { Season, Episode, getSeasonDetails } from '@/lib/tmdb'
import styles from './EpisodeSelector.module.css'

interface Props {
  seasons: Season[]
  tvId: number
  activeSeason: number
  activeEpisode: number
  onSelect: (season: number, episode: number) => void
}

export default function EpisodeSelector({ seasons, tvId, activeSeason, activeEpisode, onSelect }: Props) {
  const [selectedSeason, setSelectedSeason] = useState(activeSeason)
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [loading, setLoading] = useState(false)

  const validSeasons = seasons.filter(s => s.season_number > 0)

  useEffect(() => {
    if (!tvId) return
    const fetch = async () => {
      await Promise.resolve()
      setLoading(true)
      try {
        const d = await getSeasonDetails(tvId, selectedSeason)
        setEpisodes(d.episodes || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [tvId, selectedSeason])

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.heading}>Episodes</h3>
        <select
          className={styles.seasonSelect}
          value={selectedSeason}
          onChange={e => setSelectedSeason(Number(e.target.value))}
        >
          {validSeasons.map(s => (
            <option key={s.season_number} value={s.season_number}>
              Season {s.season_number}
              {s.episode_count ? ` · ${s.episode_count} eps` : ''}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.episodeList}>
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={`${styles.epSkeleton} skeleton`} />
            ))
          : episodes.map(ep => {
              const isActive = selectedSeason === activeSeason && ep.episode_number === activeEpisode
              return (
                <button
                  key={ep.id}
                  className={`${styles.episode} ${isActive ? styles.active : ''}`}
                  onClick={() => onSelect(selectedSeason, ep.episode_number)}
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
