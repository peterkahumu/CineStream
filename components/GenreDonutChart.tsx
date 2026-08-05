'use client'

import { useState, useMemo } from 'react'
import type { GenreTally } from '@/app/api/get-stats/route'
import TimeRangeSelector, { type TimeRange } from './TimeRangeSelector'
import styles from './GenreDonutChart.module.css'

const GENRE_COLORS = [
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#6366f1', // Indigo
]

interface Props {
  genres: GenreTally[]
  genresByRange?: {
    '7d'?: GenreTally[]
    '30d'?: GenreTally[]
    mtd?: GenreTally[]
    '90d'?: GenreTally[]
    all?: GenreTally[]
  }
}

export default function GenreDonutChart({ genres, genresByRange }: Props) {
  const [range, setRange] = useState<TimeRange>('30d')
  const [activeIdx, setActiveIdx] = useState<number | null>(null)

  // Select appropriate genre list based on active time range
  const currentGenres = useMemo(() => {
    if (genresByRange && genresByRange[range]) {
      return genresByRange[range]!
    }
    return genres || []
  }, [genres, genresByRange, range])

  const topGenres = useMemo(() => currentGenres.slice(0, 6), [currentGenres])

  const totalGenreCounts = useMemo(() => {
    return topGenres.reduce((sum, g) => sum + g.count, 0)
  }, [topGenres])

  const topCategory = useMemo(() => {
    if (topGenres.length === 0 || totalGenreCounts === 0) return null
    const top = topGenres[0]
    const percent = Math.round((top.count / totalGenreCounts) * 100)
    return { name: top.name, count: top.count, percent }
  }, [topGenres, totalGenreCounts])

  const radius = 60
  const circumference = 2 * Math.PI * radius
  const size = 170

  const slices = useMemo(() => {
    if (totalGenreCounts === 0) return []
    let cumulativePercent = 0

    return topGenres.map((genre, idx) => {
      const percent = (genre.count / totalGenreCounts) * 100
      const strokeLength = (percent / 100) * circumference
      const strokeDasharray = `${strokeLength} ${circumference - strokeLength}`
      const strokeDashoffset = -((cumulativePercent / 100) * circumference)
      const color = GENRE_COLORS[idx % GENRE_COLORS.length]

      cumulativePercent += percent

      return {
        genre,
        idx,
        percent: Math.round(percent),
        strokeDasharray,
        strokeDashoffset,
        color,
      }
    })
  }, [topGenres, totalGenreCounts, circumference])

  const activeSlice = activeIdx !== null ? slices[activeIdx] : null

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h3 className={styles.title}>
            <span>🎭</span> Top Genres
          </h3>
          <p className={styles.subtitle}>Your most watched categories in this timeframe</p>
        </div>

        <TimeRangeSelector value={range} onChange={setRange} ariaLabel="Genre time filter" />
      </div>

      <div className={styles.summaryRow}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Total Categories:</span>
          <span className={styles.summaryValue}>{topGenres.length}</span>
        </div>
        {topCategory && (
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Leading Genre:</span>
            <span className={styles.summaryValue}>
              {topCategory.name} ({topCategory.percent}%)
            </span>
          </div>
        )}
      </div>

      {topGenres.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No genre data available for this time range.</p>
        </div>
      ) : (
        <div className={styles.contentRow}>
          {/* SVG Donut Chart */}
          <div className={styles.donutContainer}>
            <svg viewBox={`0 0 ${size} ${size}`} className={styles.svgDonut}>
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="var(--bg-muted)"
                strokeWidth="18"
              />

              {slices.map(s => {
                const isActive = activeIdx === s.idx
                const isDimmed = activeIdx !== null && !isActive

                return (
                  <circle
                    key={s.genre.id}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={s.color}
                    strokeDasharray={s.strokeDasharray}
                    strokeDashoffset={s.strokeDashoffset}
                    className={`${styles.slice} ${isActive ? styles.sliceActive : ''} ${isDimmed ? styles.sliceDimmed : ''}`}
                    onMouseEnter={() => setActiveIdx(s.idx)}
                    onMouseLeave={() => setActiveIdx(null)}
                    onClick={() => setActiveIdx(activeIdx === s.idx ? null : s.idx)}
                  />
                )
              })}
            </svg>

            {/* Center text inside Donut hole */}
            <div className={styles.centerInfo}>
              {activeSlice ? (
                <>
                  <span className={styles.centerValue}>{activeSlice.percent}%</span>
                  <span className={styles.centerLabel} title={activeSlice.genre.name}>
                    {activeSlice.genre.name}
                  </span>
                  <span className={styles.centerSub}>
                    {activeSlice.genre.count} {activeSlice.genre.count === 1 ? 'title' : 'titles'}
                  </span>
                </>
              ) : (
                <>
                  <span className={styles.centerValue}>{topGenres.length}</span>
                  <span className={styles.centerLabel}>Genres</span>
                  <span className={styles.centerSub}>{totalGenreCounts} Total</span>
                </>
              )}
            </div>
          </div>

          {/* Legend with mini-bars */}
          <ul className={styles.legend}>
            {slices.map(s => {
              const isActive = activeIdx === s.idx

              return (
                <li
                  key={s.genre.id}
                  className={`${styles.legendItem} ${isActive ? styles.legendItemActive : ''}`}
                  onMouseEnter={() => setActiveIdx(s.idx)}
                  onMouseLeave={() => setActiveIdx(null)}
                  onClick={() => setActiveIdx(activeIdx === s.idx ? null : s.idx)}
                >
                  <div className={styles.legendItemHeader}>
                    <div className={styles.legendNameGroup}>
                      <span className={styles.colorDot} style={{ backgroundColor: s.color }} />
                      <span className={styles.genreName}>{s.genre.name}</span>
                    </div>
                    <div className={styles.genreStats}>
                      <span className={styles.genreCount}>{s.genre.count}</span>
                      <span className={styles.genrePercent}>({s.percent}%)</span>
                    </div>
                  </div>

                  <div className={styles.miniBarTrack}>
                    <div
                      className={styles.miniBarFill}
                      style={{
                        width: `${s.percent}%`,
                        backgroundColor: s.color,
                      }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
