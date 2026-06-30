'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { MediaItem, backdropUrl, mediaTitle, mediaYear, mediaType as getType } from '@/lib/tmdb'
import styles from './HeroBanner.module.css'

interface Props {
  items: MediaItem[]
  loading?: boolean
  /** Controlled index — parent can drive the active slide */
  activeIdx?: number
  /** Called whenever the banner advances (auto or dot click) */
  onSlide?: (idx: number) => void
}

export default function HeroBanner({ items, loading, activeIdx: controlledIdx, onSlide }: Props) {
  const [internalIdx, setInternalIdx] = useState(0)
  const [fading, setFading] = useState(false)

  // Use controlled idx if provided, else internal
  const idx = controlledIdx !== undefined ? controlledIdx : internalIdx

  const goTo = useCallback((i: number) => {
    setFading(true)
    setTimeout(() => {
      setInternalIdx(i)
      onSlide?.(i)
      setFading(false)
    }, 300)
  }, [onSlide])

  // Sync internal state when controlled idx changes from outside
  useEffect(() => {
    if (controlledIdx !== undefined && controlledIdx !== internalIdx) {
      setFading(true)
      setTimeout(() => {
        setInternalIdx(controlledIdx)
        setFading(false)
      }, 300)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlledIdx])

  const idxRef = useRef(idx)
  useEffect(() => { idxRef.current = idx }, [idx])

  // Auto-advance
  useEffect(() => {
    if (items.length < 2) return
    const t = setInterval(() => {
      goTo((idxRef.current + 1) % items.length)
    }, 6000)
    return () => clearInterval(t)
  }, [items.length, goTo])

  const featured = items[idx]

  if (loading || !featured) {
    return <div className={`${styles.hero} ${styles.skeleton}`} />
  }

  const backdrop = backdropUrl(featured.backdrop_path, 'original')
  const type = getType(featured)
  const href = `/details/${featured.id}?type=${type}`

  return (
    <div className={`${styles.hero} ${fading ? styles.fading : ''}`}>
      {backdrop && (
        <Image
          src={backdrop}
          alt={mediaTitle(featured)}
          fill
          priority
          className={styles.bg}
          sizes="100vw"
        />
      )}

      <div className={styles.gradientBottom} />
      <div className={styles.gradientLeft} />

      <div className={`${styles.content} page-container`}>
        <div className={styles.meta}>
          <span className={`badge badge-${type}`}>{type === 'tv' ? 'TV Show' : 'Movie'}</span>
          {mediaYear(featured) && <span className={styles.year}>{mediaYear(featured)}</span>}
          {featured.vote_average > 0 && (
            <div className="rating">⭐ {featured.vote_average.toFixed(1)}</div>
          )}
        </div>

        <h1 className={styles.title}>{mediaTitle(featured)}</h1>

        {/* Overview — CSS hides this on mobile; FeaturedStrip shows overview-like info instead */}
        {featured.overview && (
          <p className={styles.overview}>{featured.overview}</p>
        )}

        <div className={styles.actions}>
          <Link href={href} className={`btn btn-primary ${styles.viewBtn}`}>
            ▶ View Details
          </Link>
          <div className={styles.dots}>
            {items.slice(0, 8).map((_, i) => (
              <button
                key={i}
                className={`${styles.dot} ${i === idx ? styles.dotActive : ''}`}
                onClick={() => goTo(i)}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
