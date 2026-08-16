'use client'

import { useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import type { ShowAiringInfo } from '@/lib/tmdb'
import { airedEpisodeCount } from '@/lib/episodes'
import styles from './EpisodeDrawer.module.css'

interface Props {
  id: string
  season: number
  episode: number
  airing?: ShowAiringInfo
  /** Pre-resolved by WatchClient, which already knows what actually comes next. */
  prevHref: string | null
  nextHref: string | null
}

function watchHref(id: string, season: number, episode: number): string {
  return `/watch/${id}?type=tv&s=${season}&e=${episode}`
}

/**
 * In-player episode switcher.
 *
 * Collapsed by default and rendered entirely from season data the page already
 * has, so opening it costs nothing — no fetch, and no iframe churn. Only an
 * actual episode click navigates, which makes this exactly as expensive as the
 * Prev/Next buttons it sits beside. That is the whole reason the browsing grid
 * stays on /details: picking an episode here should never mean half-loading one
 * you didn't want.
 */
export default function EpisodeDrawer({ id, season, episode, airing, prevHref, nextHref }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [viewSeason, setViewSeason] = useState(season)

  const toggleOpen = useCallback(() => setIsOpen(open => !open), [])

  // Specials (season 0) and seasons with nothing aired yet are not switchable
  // targets, so they never make it into the picker.
  const seasons = useMemo(() => {
    return (airing?.seasons ?? [])
      .filter(s => s.season_number > 0 && airedEpisodeCount(airing, s.season_number) > 0)
      .sort((a, b) => a.season_number - b.season_number)
  }, [airing])

  const episodeCount = airedEpisodeCount(airing, viewSeason)
  const episodes = useMemo(
    () => Array.from({ length: episodeCount }, (_, i) => i + 1),
    [episodeCount]
  )

  const hasPicker = seasons.length > 0

  return (
    <div className={styles.drawer}>
      <div className={styles.bar}>
        {hasPicker ? (
          <button
            type="button"
            className={styles.toggle}
            onClick={toggleOpen}
            aria-expanded={isOpen}
            aria-controls={`episode-drawer-${id}`}
          >
            <span className={styles.toggleLabel}>
              📺 Season {season} · Episode {episode}
            </span>
            <span className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`} aria-hidden="true">
              ▾
            </span>
          </button>
        ) : (
          <span className={styles.toggleLabel}>
            📺 Season {season} · Episode {episode}
          </span>
        )}

        <div className={styles.nav}>
          {prevHref && (
            <Link href={prevHref} className={`btn btn-secondary ${styles.navBtn}`}>
              ← Prev
            </Link>
          )}
          {nextHref && (
            <Link href={nextHref} className={`btn btn-secondary ${styles.navBtn}`}>
              Next →
            </Link>
          )}
        </div>
      </div>

      {hasPicker && isOpen && (
        <div className={styles.panel} id={`episode-drawer-${id}`}>
          {seasons.length > 1 && (
            <div className={styles.seasonRow} role="tablist" aria-label="Seasons">
              {seasons.map(s => (
                <button
                  key={s.season_number}
                  type="button"
                  role="tab"
                  aria-selected={s.season_number === viewSeason}
                  className={`${styles.seasonBtn} ${s.season_number === viewSeason ? styles.seasonBtnActive : ''}`}
                  onClick={() => setViewSeason(s.season_number)}
                >
                  S{s.season_number}
                </button>
              ))}
            </div>
          )}

          <div className={styles.episodeGrid}>
            {episodes.map(ep => {
              const isCurrent = ep === episode && viewSeason === season
              return (
                <Link
                  key={ep}
                  href={watchHref(id, viewSeason, ep)}
                  className={`${styles.episodeBtn} ${isCurrent ? styles.episodeBtnActive : ''}`}
                  aria-current={isCurrent ? 'page' : undefined}
                >
                  {ep}
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
