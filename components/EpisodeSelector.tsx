'use client'

import { useState, useRef, useEffect } from 'react'

import Link from 'next/link'
import Image from 'next/image'
import { Season, Episode, backdropUrl } from '@/lib/tmdb'
import styles from './EpisodeSelector.module.css'

interface Props {
  seasons: Season[]
  tvId: number
  activeSeason: number
  activeEpisode: number
  episodes: Episode[]
}

function createOutsideClickHandler(
  ref: React.RefObject<HTMLDivElement | null>,
  onClose: () => void,
) {
  return (event: MouseEvent) => {
    if (ref.current && !ref.current.contains(event.target as Node)) {
      onClose()
    }
  }
}

export default function EpisodeSelector({ seasons, tvId, activeSeason, activeEpisode, episodes }: Props) {

  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = createOutsideClickHandler(dropdownRef, () => setIsDropdownOpen(false))
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const activeSeasonData = seasons.find(s => s.season_number === activeSeason)

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.heading}>Episodes</h3>
        
        {/* Custom Season Dropdown */}
        <div className={styles.dropdownContainer} ref={dropdownRef}>
          <button 
            className={styles.dropdownToggle}
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            aria-expanded={isDropdownOpen}
          >
            {activeSeasonData?.name || `Season ${activeSeason}`}
            <svg 
              className={`${styles.chevron} ${isDropdownOpen ? styles.chevronOpen : ''}`} 
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>

          {isDropdownOpen && (
            <div className={styles.dropdownMenu}>
              {seasons.map(s => (
                <Link
                  key={s.season_number}
                  href={`/details/${tvId}?type=tv&tab=watch&s=${s.season_number}`}
                  className={`${styles.dropdownItem} ${s.season_number === activeSeason ? styles.dropdownItemActive : ''}`}
                  onClick={() => setIsDropdownOpen(false)}
                  replace={true}
                  scroll={false}
                >
                  <div className={styles.seasonName}>{s.name || `Season ${s.season_number}`}</div>
                  {s.episode_count ? <div className={styles.seasonEps}>{s.episode_count} Episodes</div> : null}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={styles.episodeList}>
        {episodes.map(ep => {
          const isActive = ep.episode_number === activeEpisode
          const imgUrl = backdropUrl(ep.still_path, 'w300')

          return (
            <Link
              key={ep.id}
              href={`/watch/${tvId}?type=tv&s=${activeSeason}&e=${ep.episode_number}`}
              className={`${styles.episode} ${isActive ? styles.active : ''}`}
            >
              <div className={styles.epMainRow}>
                <div className={styles.epNum}>{ep.episode_number}</div>
                
                <div className={styles.thumbnailContainer}>
                  {imgUrl ? (
                    <Image src={imgUrl} alt={ep.name} fill className={styles.thumbnail} sizes="160px" />
                  ) : (
                    <div className={styles.thumbnailPlaceholder}>No Image</div>
                  )}
                  <div className={styles.playOverlay}>
                    {isActive ? (
                      <span className={styles.playingText}>Playing</span>
                    ) : (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                      </svg>
                    )}
                  </div>
                </div>

                <div className={styles.epHeader}>
                  <div className={styles.epTitle}>{ep.name || `Episode ${ep.episode_number}`}</div>
                  <div className={styles.epMeta}>
                    {ep.air_date && <span className={styles.epDate}>{ep.air_date.slice(0, 4)}</span>}
                    {ep.vote_average > 0 && <span className={styles.epRating}>★ {ep.vote_average.toFixed(1)}</span>}
                  </div>
                </div>
              </div>

              {ep.overview && (
                <p className={styles.epOverview}>
                  {ep.overview}
                </p>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
