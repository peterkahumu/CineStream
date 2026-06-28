'use client'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { MediaItem, posterUrl, mediaTitle, mediaYear, mediaType as getType } from '@/lib/tmdb'
import styles from './MediaCard.module.css'

interface Props {
  item: MediaItem
  forcedType?: 'movie' | 'tv'
  priority?: boolean
}

export default function MediaCard({ item, forcedType, priority = false }: Props) {
  const [imgErr, setImgErr] = useState(false)
  const type = forcedType ?? getType(item)
  const title = mediaTitle(item)
  const year = mediaYear(item)
  const rating = item.vote_average?.toFixed(1)
  const poster = posterUrl(item.poster_path, 'w342')
  const href = `/details/${item.id}?type=${type}`

  return (
    <Link href={href} className={styles.card}>
      <div className={styles.poster}>
        {poster && !imgErr ? (
          <Image
            src={poster}
            alt={title}
            fill
            sizes="(max-width: 640px) 150px, (max-width: 1024px) 175px, 190px"
            className={styles.img}
            onError={() => setImgErr(true)}
            priority={priority}
          />
        ) : (
          <div className={styles.noImg}>
            <span>🎬</span>
            <span className={styles.noImgTitle}>{title}</span>
          </div>
        )}

        {/* Hover overlay */}
        <div className={styles.overlay}>
          <div className={styles.overlayContent}>
            <span className={`badge badge-${type}`}>{type === 'tv' ? 'TV' : 'Movie'}</span>
            {rating && Number(rating) > 0 && (
              <div className="rating">⭐ {rating}</div>
            )}
            <button className={`btn btn-primary ${styles.watchBtn}`}>
              ▶ View
            </button>
          </div>
        </div>

        {/* Rating badge (always visible) */}
        {rating && Number(rating) > 0 && (
          <div className={styles.ratingBadge}>
            ⭐ {rating}
          </div>
        )}

        {/* Type pill */}
        <div className={`${styles.typePill} badge badge-${type}`}>
          {type === 'tv' ? 'TV' : 'Film'}
        </div>
      </div>

      <div className={styles.info}>
        <h3 className={styles.title} title={title}>{title}</h3>
        {year && <span className={styles.year}>{year}</span>}
      </div>
    </Link>
  )
}
