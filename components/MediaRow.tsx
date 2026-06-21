'use client'
import Link from 'next/link'
import MediaCard from './MediaCard'
import { MediaItem } from '@/lib/tmdb'
import styles from './MediaRow.module.css'

interface Props {
  title: string
  emoji?: string
  items: MediaItem[]
  loading?: boolean
  seeAllHref?: string
  forcedType?: 'movie' | 'tv'
}

export default function MediaRow({ title, emoji, items, loading, seeAllHref, forcedType }: Props) {
  return (
    <section className={styles.section}>
      <div className="section-header">
        <h2 className="section-title">
          {emoji && <span style={{ marginRight: 4 }}>{emoji}</span>}
          {title}
        </h2>
        {seeAllHref && (
          <Link href={seeAllHref} className={styles.seeAll}>
            See all →
          </Link>
        )}
      </div>

      <div className={styles.scroller}>
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={`${styles.skeletonCard} skeleton`} />
            ))
          : items.slice(0, 20).map(item => (
              <div key={`${item.media_type ?? forcedType}-${item.id}`} className={styles.cardWrap}>
                <MediaCard item={item} forcedType={forcedType} />
              </div>
            ))}
      </div>
    </section>
  )
}
