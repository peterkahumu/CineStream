'use client'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { MediaItem, posterUrl, mediaTitle, mediaYear, mediaType as getType } from '@/lib/tmdb'
import { useSettings } from '@/components/SettingsProvider'
import styles from './MediaCard.module.css'

interface Props {
  item: MediaItem
  forcedType?: 'movie' | 'tv'
  priority?: boolean
  progress?: number
  bottomSubtitle?: React.ReactNode
  onRemove?: (e: React.MouseEvent) => void
  customHref?: string
  singleLineTitle?: boolean
}

function isUpcoming(item: MediaItem): boolean {
  const dateStr = item.release_date || item.first_air_date
  if (!dateStr) return false
  return new Date(dateStr) > new Date()
}

export default function MediaCard({ 
  item, 
  forcedType, 
  priority = false,
  progress,
  bottomSubtitle,
  onRemove,
  customHref,
  singleLineTitle
}: Props) {
  const [imgErr, setImgErr] = useState(false)
  const { settings } = useSettings()
  const type = forcedType ?? getType(item)
  const title = mediaTitle(item)
  const year = mediaYear(item)
  const rating = item.vote_average?.toFixed(1)
  // Data saver: use lower-res poster
  const poster = posterUrl(item.poster_path, settings.dataSaver ? 'w185' : 'w342')
  const href = customHref || `/details/${item.id}?type=${type}`
  const upcoming = isUpcoming(item)

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

        {onRemove && (
          <button
            className={styles.removeBtn}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onRemove(e)
            }}
            title="Remove"
          >
            ×
          </button>
        )}

        {progress !== undefined && (
          <div className={styles.progressContainer}>
            <div className={styles.progressBar} style={{ width: `${progress}%` }} />
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
              {upcoming ? '📅 View' : '▶ View'}
            </button>
          </div>
        </div>

        {/* Rating badge (always visible) — hidden for upcoming with no rating */}
        {rating && Number(rating) > 0 && (
          <div className={styles.ratingBadge}>
            ⭐ {rating}
          </div>
        )}

        {/* Coming Soon badge for future releases */}
        {upcoming && (
          <div className={styles.comingSoonBadge}>🍿 Soon</div>
        )}

        {/* Type pill */}
        <div className={`${styles.typePill} badge badge-${type}`}>
          {type === 'tv' ? 'TV' : 'Film'}
        </div>
      </div>

      <div className={styles.info}>
        <h3 className={`${styles.title} ${singleLineTitle ? styles.singleLine : ''}`} title={title}>
          {title}
        </h3>
        {bottomSubtitle ? (
          <div className={`${styles.year} ${styles.singleLine}`}>{bottomSubtitle}</div>
        ) : (
          year && <span className={styles.year}>{year}</span>
        )}
      </div>
    </Link>
  )
}
