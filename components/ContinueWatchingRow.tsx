'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Modal from './Modal'
import { getAllProgress, removeProgress, type WatchProgress } from '@/lib/progressTracker'
import styles from './ContinueWatchingRow.module.css'

export default function ContinueWatchingRow() {
  const [items, setItems] = useState<WatchProgress[]>([])
  const [itemToRemove, setItemToRemove] = useState<WatchProgress | null>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)

  // ── Data loading ─────────────────────────────────────────────────────────────

  const loadItems = useCallback(() => {
    setItems(getAllProgress())
  }, [])

  // ── Effects — function calls only ────────────────────────────────────────────

  useEffect(() => {
    loadItems()
  }, [loadItems])

  // Storage events fire when another tab modifies localStorage
  useEffect(() => {
    window.addEventListener('storage', loadItems)
    return () => window.removeEventListener('storage', loadItems)
  }, [loadItems])

  // ── Interaction handlers ─────────────────────────────────────────────────────

  const requestRemove = useCallback((item: WatchProgress, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setItemToRemove(item)
  }, [])

  const confirmRemove = useCallback(() => {
    if (itemToRemove) {
      removeProgress(itemToRemove.id)
      loadItems()
      setItemToRemove(null)
    }
  }, [itemToRemove, loadItems])

  const cancelRemove = useCallback(() => {
    setItemToRemove(null)
  }, [])

  const scroll = useCallback((direction: 'left' | 'right') => {
    if (!scrollerRef.current) return
    const { clientWidth } = scrollerRef.current
    const amount = direction === 'left' ? -clientWidth * 0.75 : clientWidth * 0.75
    scrollerRef.current.scrollBy({ left: amount, behavior: 'smooth' })
  }, [])

  // ── Utilities ────────────────────────────────────────────────────────────────

  function formatTimeLeft(watched: number, duration: number): string {
    if (duration > watched + 10) {
      const remaining = duration - watched
      const h = Math.floor(remaining / 3600)
      const m = Math.floor((remaining % 3600) / 60)
      return h > 0 ? `${h}h ${m}m left` : `${m}m left`
    }
    const h = Math.floor(watched / 3600)
    const m = Math.floor((watched % 3600) / 60)
    return h > 0 ? `${h}h ${m}m watched` : `${m}m watched`
  }

  function buildWatchUrl(item: WatchProgress): string {
    if (item.mediaType === 'movie') return `/watch/${item.id}?type=movie`
    const s = item.season ?? 1
    const e = item.episode ?? 1
    return `/watch/${item.id}?type=tv&s=${s}&e=${e}`
  }

  function buildPosterSrc(item: WatchProgress): string | null {
    if (item.poster_path) return `https://image.tmdb.org/t/p/w342${item.poster_path}`
    if (item.backdrop_path) return `https://image.tmdb.org/t/p/w500${item.backdrop_path}`
    return null
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (items.length === 0) return null

  return (
    <section className={styles.section}>
      <div className="section-header">
        <h2 className="section-title">
          <span style={{ marginRight: 4 }}>⏱️</span>
          Continue Watching
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
          {items.map((item) => {
            const progress = item.duration
              ? Math.min(100, Math.max(0, (item.watched / item.duration) * 100))
              : 0
            const url = buildWatchUrl(item)
            const posterSrc = buildPosterSrc(item)

            return (
              <Link href={url} key={item.id} className={styles.cardWrap}>
                <div className={styles.card}>
                  <div className={styles.poster}>
                    {posterSrc ? (
                      <Image
                        src={posterSrc}
                        alt={item.title}
                        fill
                        className={styles.img}
                        sizes="(max-width: 640px) 150px, (max-width: 1024px) 175px, 190px"
                      />
                    ) : (
                      <div className={styles.noImg}>🎬</div>
                    )}
                    <button
                      className={styles.removeBtn}
                      onClick={(e) => requestRemove(item, e)}
                      title="Remove from continue watching"
                    >
                      ×
                    </button>
                    <div className={styles.playOverlay}>
                      <div className={styles.playIcon}>▶</div>
                    </div>
                  </div>

                  <div className={styles.progressContainer}>
                    <div className={styles.progressBar} style={{ width: `${progress}%` }} />
                  </div>

                  <div className={styles.info}>
                    <h3 className={styles.title} title={item.title}>
                      {item.title}
                    </h3>
                    <div className={styles.meta}>
                      {item.mediaType === 'tv' && (
                        <span>S{item.season} E{item.episode} • </span>
                      )}
                      <span>{formatTimeLeft(item.watched, item.duration)}</span>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        <button
          className={`${styles.scrollBtn} ${styles.scrollRight}`}
          onClick={() => scroll('right')}
          aria-label="Scroll right"
        >
          ›
        </button>
      </div>

      <Modal
        isOpen={!!itemToRemove}
        title="Remove Continue Watching"
        description={`Are you sure you want to remove "${itemToRemove?.title}" from your continue watching?`}
        confirmText="Remove"
        onConfirm={confirmRemove}
        onCancel={cancelRemove}
      />
    </section>
  )
}
