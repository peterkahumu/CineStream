'use client'
import { useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { MediaItem, posterUrl, mediaTitle, mediaYear, mediaType as getType } from '@/lib/tmdb'
import styles from './FeaturedStrip.module.css'

interface Props {
  items: MediaItem[]
  title?: string
  emoji?: string
  link?: string
}

export default function FeaturedStrip({ items, title, emoji, link }: Props) {
  if (!items || items.length === 0) return null

  return (
    <div className={styles.strip}>
      {title && (
        <div style={{ padding: '0 16px', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            {emoji} {title}
          </h2>
          {link && (
            <Link href={link} style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 500, textDecoration: 'none' }}>
              See All →
            </Link>
          )}
        </div>
      )}
      <div className={styles.scroller}>
        {items.map((item, i) => {
          const type = getType(item)
          const href = `/details/${item.id}?type=${type}`
          const poster = posterUrl(item.poster_path, 'w185')
          const year = mediaYear(item)

          return (
            <Link
              key={item.id}
              href={href}
              className={styles.card}
              aria-label={mediaTitle(item)}
            >
              {/* Poster thumbnail */}
              <div className={styles.thumb}>
                {poster ? (
                  <Image
                    src={poster}
                    alt={mediaTitle(item)}
                    fill
                    sizes="52px"
                    className={styles.thumbImg}
                  />
                ) : (
                  <div className={styles.thumbFallback}>🎬</div>
                )}
              </div>

              {/* Info */}
              <div className={styles.info}>
                <div className={styles.cardType}>
                  <span className={`badge badge-${type}`} style={{ fontSize: '0.55rem', padding: '1px 5px' }}>
                    {type === 'tv' ? 'TV' : 'Film'}
                  </span>
                  {year && <span className={styles.cardYear}>{year}</span>}
                </div>
                <div className={styles.cardTitle}>{mediaTitle(item)}</div>
                {item.vote_average > 0 && (
                  <div className={styles.cardRating}>⭐ {item.vote_average.toFixed(1)}</div>
                )}
              </div>

              {/* Play/view button */}
              <div className={styles.playBtn}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
