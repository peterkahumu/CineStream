'use client'

import { useState, useMemo, useRef, useCallback } from 'react'
import type { ActivityPoint } from '@/app/api/get-stats/route'
import TimeRangeSelector, { type TimeRange } from './TimeRangeSelector'
import styles from './ActivityLineChart.module.css'

interface Props {
  activitySeries: ActivityPoint[]
}

function formatDateLabel(dateStr: string, range: TimeRange): string {
  const d = new Date(`${dateStr}T00:00:00`)
  if (range === '7d') {
    return d.toLocaleDateString('en-US', { weekday: 'short' })
  }
  return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })
}

function formatFullDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

function buildSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`

  let path = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i]
    const next = points[i + 1]
    const controlX = (current.x + next.x) / 2
    path += ` C ${controlX} ${current.y}, ${controlX} ${next.y}, ${next.x} ${next.y}`
  }
  return path
}

export default function ActivityLineChart({ activitySeries }: Props) {
  const [range, setRange] = useState<TimeRange>('30d')
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const filteredData = useMemo(() => {
    if (!activitySeries || activitySeries.length === 0) return []

    if (range === '7d') {
      return activitySeries.slice(-7)
    }
    if (range === '30d') {
      return activitySeries.slice(-30)
    }
    if (range === 'mtd') {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
      const mtd = activitySeries.filter(p => p.date >= startOfMonth)
      return mtd.length > 0 ? mtd : activitySeries.slice(-7)
    }
    return activitySeries.slice(-90)
  }, [activitySeries, range])

  const totalWatched = useMemo(() => {
    return filteredData.reduce((sum, p) => sum + p.count, 0)
  }, [filteredData])

  const totalMovies = useMemo(() => {
    return filteredData.reduce((sum, p) => sum + p.movies, 0)
  }, [filteredData])

  const totalTV = useMemo(() => {
    return filteredData.reduce((sum, p) => sum + p.tvShows, 0)
  }, [filteredData])

  const peakDayInRange = useMemo(() => {
    if (filteredData.length === 0) return null
    return filteredData.reduce((max, p) => (p.count > max.count ? p : max), filteredData[0])
  }, [filteredData])

  const width = 600
  const height = 180
  const paddingLeft = 32
  const paddingRight = 16
  const paddingTop = 20
  const paddingBottom = 30
  const chartWidth = width - paddingLeft - paddingRight
  const chartHeight = height - paddingTop - paddingBottom

  const maxVal = useMemo(() => {
    const rawMax = Math.max(1, ...filteredData.map(p => p.count))
    return Math.ceil(rawMax * 1.2)
  }, [filteredData])

  const points = useMemo(() => {
    if (filteredData.length === 0) return []
    const step = filteredData.length > 1 ? chartWidth / (filteredData.length - 1) : chartWidth
    return filteredData.map((d, i) => {
      const x = paddingLeft + (filteredData.length === 1 ? chartWidth / 2 : i * step)
      const y = paddingTop + chartHeight - (d.count / maxVal) * chartHeight
      return { x, y, data: d, index: i }
    })
  }, [filteredData, maxVal, chartWidth, chartHeight, paddingLeft, paddingTop])

  const linePath = useMemo(() => buildSmoothPath(points), [points])

  const areaPath = useMemo(() => {
    if (points.length === 0) return ''
    const firstX = points[0].x
    const lastX = points[points.length - 1].x
    const bottomY = paddingTop + chartHeight
    return `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`
  }, [linePath, points, paddingTop, chartHeight])

  const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!containerRef.current || points.length === 0) return
    const rect = containerRef.current.getBoundingClientRect()
    const relativeX = (e.clientX - rect.left) * (width / rect.width)
    
    let closestIdx = 0
    let minDiff = Infinity
    points.forEach((p, idx) => {
      const diff = Math.abs(p.x - relativeX)
      if (diff < minDiff) {
        minDiff = diff
        closestIdx = idx
      }
    })
    setHoveredIdx(closestIdx)
  }, [points, width])

  const handlePointerLeave = useCallback(() => {
    setHoveredIdx(null)
  }, [])

  const activePoint = hoveredIdx !== null ? points[hoveredIdx] : null
  const yTicks = [0, Math.round(maxVal / 2), maxVal]

  const labelStride = useMemo(() => {
    if (filteredData.length <= 7) return 1
    if (filteredData.length <= 14) return 2
    if (filteredData.length <= 31) return 5
    return 10
  }, [filteredData.length])

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h3 className={styles.title}>
            <span>📈</span> Viewing Activity
          </h3>
          <p className={styles.subtitle}>Track your watching momentum over time</p>
        </div>

        <TimeRangeSelector value={range} onChange={setRange} ariaLabel="Activity time filter" />
      </div>

      <div className={styles.summaryRow}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Total Titles:</span>
          <span className={styles.summaryValue}>{totalWatched}</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Movies / TV:</span>
          <span className={styles.summaryValue}>{totalMovies}m / {totalTV}tv</span>
        </div>
        {peakDayInRange && peakDayInRange.count > 0 && (
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Peak Day:</span>
            <span className={styles.summaryValue}>
              {peakDayInRange.count} on {formatDateLabel(peakDayInRange.date, '30d')}
            </span>
          </div>
        )}
      </div>

      <div className={styles.chartContainer} ref={containerRef}>
        {totalWatched === 0 && filteredData.length === 0 ? (
          <div className={styles.emptyNotice}>
            <p>No viewing activity recorded in this period.</p>
          </div>
        ) : (
          <>
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className={styles.svgChart}
              onPointerMove={handlePointerMove}
              onPointerLeave={handlePointerLeave}
              onTouchMove={e => {
                if (e.touches.length > 0) {
                  const touch = e.touches[0]
                  if (!containerRef.current) return
                  const rect = containerRef.current.getBoundingClientRect()
                  const relativeX = (touch.clientX - rect.left) * (width / rect.width)
                  let closestIdx = 0
                  let minDiff = Infinity
                  points.forEach((p, idx) => {
                    const diff = Math.abs(p.x - relativeX)
                    if (diff < minDiff) {
                      minDiff = diff
                      closestIdx = idx
                    }
                  })
                  setHoveredIdx(closestIdx)
                }
              }}
            >
              <defs>
                <linearGradient id="activityGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.32" />
                  <stop offset="80%" stopColor="var(--accent)" stopOpacity="0.04" />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                </linearGradient>
              </defs>

              {yTicks.map(tick => {
                const y = paddingTop + chartHeight - (tick / maxVal) * chartHeight
                return (
                  <g key={tick}>
                    <line
                      x1={paddingLeft}
                      y1={y}
                      x2={width - paddingRight}
                      y2={y}
                      className={styles.gridLine}
                    />
                    <text
                      x={paddingLeft - 8}
                      y={y + 4}
                      textAnchor="end"
                      className={styles.gridLabel}
                    >
                      {tick}
                    </text>
                  </g>
                )
              })}

              {areaPath && <path d={areaPath} className={styles.areaFill} />}
              {linePath && <path d={linePath} className={styles.linePath} />}

              {points.map((p, i) => {
                if (i % labelStride !== 0 && i !== points.length - 1) return null
                return (
                  <text
                    key={p.data.date}
                    x={p.x}
                    y={height - 8}
                    textAnchor="middle"
                    className={styles.gridLabel}
                  >
                    {formatDateLabel(p.data.date, range)}
                  </text>
                )
              })}

              {activePoint && (
                <g>
                  <line
                    x1={activePoint.x}
                    y1={paddingTop}
                    x2={activePoint.x}
                    y2={paddingTop + chartHeight}
                    className={styles.crosshair}
                  />
                  <circle
                    cx={activePoint.x}
                    cy={activePoint.y}
                    className={`${styles.point} ${styles.pointActive}`}
                  />
                </g>
              )}

              {points.length <= 14 &&
                points.map((p, i) => (
                  <circle
                    key={p.data.date}
                    cx={p.x}
                    cy={p.y}
                    r={hoveredIdx === i ? 6 : 3.5}
                    className={`${styles.point} ${hoveredIdx === i ? styles.pointActive : ''}`}
                    onClick={() => setHoveredIdx(i)}
                  />
                ))}
            </svg>

            {activePoint && containerRef.current && (
              <div
                className={styles.tooltip}
                style={{
                  left: `${Math.max(18, Math.min(82, (activePoint.x / width) * 100))}%`,
                }}
              >
                <span className={styles.tooltipDate}>{formatFullDate(activePoint.data.date)}</span>
                <span className={styles.tooltipCount}>
                  <span>📺</span> {activePoint.data.count} {activePoint.data.count === 1 ? 'Title' : 'Titles'}
                </span>
                <span className={styles.tooltipBreakdown}>
                  {activePoint.data.movies} Movies · {activePoint.data.tvShows} TV Shows
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
