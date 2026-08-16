'use client'

import { useRef, useCallback } from 'react'
import styles from './CardRow.module.css'

interface Props {
  title: string
  emoji?: string
  /** One entry per card — each is wrapped in the row's card slot. */
  children: React.ReactNode
}

/**
 * The horizontal card rail used by the personal rows (Continue Watching,
 * Upcoming Episodes) — section heading, snap scroller and desktop scroll
 * buttons. Cards come from MediaCard so they match the rest of the app; this
 * only owns the row around them, so the personal rows stay identical to each
 * other as either one changes.
 */
export default function CardRow({ title, emoji, children }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null)

  const scroll = useCallback((direction: 'left' | 'right') => {
    if (!scrollerRef.current) return
    const { clientWidth } = scrollerRef.current
    const amount = direction === 'left' ? -clientWidth * 0.75 : clientWidth * 0.75
    scrollerRef.current.scrollBy({ left: amount, behavior: 'smooth' })
  }, [])

  return (
    <section className={styles.section}>
      <div className="section-header">
        <h2 className="section-title">
          {emoji && <span style={{ marginRight: 4 }}>{emoji}</span>}
          {title}
        </h2>
      </div>

      <div className={styles.rowContainer}>
        <button
          className={`${styles.scrollBtn} ${styles.scrollLeft}`}
          onClick={() => scroll('left')}
          aria-label="Scroll left"
        >
          ‹
        </button>

        <div className={styles.scroller} ref={scrollerRef}>
          {children}
        </div>

        <button
          className={`${styles.scrollBtn} ${styles.scrollRight}`}
          onClick={() => scroll('right')}
          aria-label="Scroll right"
        >
          ›
        </button>
      </div>
    </section>
  )
}

export { styles as cardRowStyles }
