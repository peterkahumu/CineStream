'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { MediaItem, backdropUrl, mediaTitle, mediaYear, mediaType as getType } from '@/lib/tmdb'
import styles from './HeroBanner.module.css'

interface Props {
  items: MediaItem[]
  loading?: boolean
}

export default function HeroBanner({ items, loading }: Props) {
  const [idx, setIdx] = useState(0)
  const [fading, setFading] = useState(false)

  const featured = items[idx]

  useEffect(() => {
    if (items.length < 2) return
    const t = setInterval(() => {
      setFading(true)
      setTimeout(() => {
        setIdx(i => (i + 1) % items.length)
        setFading(false)
      }, 400)
    }, 7000)
    return () => clearInterval(t)
  }, [items.length])

  if (loading || !featured) {
    return <div className={`${styles.hero} ${styles.skeleton} skeleton`} />
  }

  const backdrop = backdropUrl(featured.backdrop_path, 'original')
  const type = getType(featured)
  const href = `/details/${featured.id}?type=${type}`

  return (
    <div className={`${styles.hero} ${fading ? styles.fading : ''}`}>
      {/* Background */}
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

      {/* Gradient overlays */}
      <div className={styles.gradientBottom} />
      <div className={styles.gradientLeft} />

      {/* Content */}
      <div className={`${styles.content} page-container`}>
        <div className={styles.meta}>
          <span className={`badge badge-${type}`}>{type === 'tv' ? 'TV Show' : 'Movie'}</span>
          {mediaYear(featured) && (
            <span className={styles.year}>{mediaYear(featured)}</span>
          )}
          {featured.vote_average > 0 && (
            <div className="rating">⭐ {featured.vote_average.toFixed(1)}</div>
          )}
        </div>

        <h1 className={styles.title}>{mediaTitle(featured)}</h1>

        {featured.overview && (
          <p className={styles.overview}>{featured.overview}</p>
        )}

        <div className={styles.actions}>
          <Link href={href} className="btn btn-primary" style={{ fontSize: '1rem', padding: '12px 28px' }}>
            ▶ View Details
          </Link>
          <div className={styles.dots}>
            {items.slice(0, 8).map((_, i) => (
              <button
                key={i}
                className={`${styles.dot} ${i === idx ? styles.dotActive : ''}`}
                onClick={() => { setFading(true); setTimeout(() => { setIdx(i); setFading(false) }, 400) }}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
