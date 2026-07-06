'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Modal from './Modal'
import styles from './ContinueWatchingRow.module.css'

interface SavedProgress {
  key: string
  id: string
  mediaType: 'movie' | 'tv'
  title: string
  backdrop?: string | null
  poster?: string | null
  season?: number
  episode?: number
  time: number
  duration: number
  updatedAt: number
}

export default function ContinueWatchingRow() {
  const [items, setItems] = useState<SavedProgress[]>([])
  const [itemToRemove, setItemToRemove] = useState<SavedProgress | null>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadItems()
  }, [])

  function loadItems() {
    const loaded: SavedProgress[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('cinesrc-progress-')) {
        try {
          const parsed = JSON.parse(localStorage.getItem(key)!)
          // Ensure it has basic required fields before adding
          if (parsed.id && parsed.title) {
            loaded.push({ key, ...parsed })
          }
        } catch (e) {
          console.error('Failed to parse saved progress', e)
        }
      }
    }
    loaded.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    setItems(loaded)
  }

  function requestRemove(item: SavedProgress, e: React.MouseEvent) {
    e.preventDefault() // prevent link navigation
    e.stopPropagation()
    setItemToRemove(item)
  }

  function confirmRemove() {
    if (itemToRemove) {
      localStorage.removeItem(itemToRemove.key)
      loadItems()
      setItemToRemove(null)
    }
  }

  const scroll = (direction: 'left' | 'right') => {
    if (scrollerRef.current) {
      const { clientWidth } = scrollerRef.current
      const scrollAmount = direction === 'left' ? -clientWidth * 0.75 : clientWidth * 0.75
      scrollerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  function formatTimeLeft(time: number, duration: number) {
    if (duration > time + 10) { // If there's a meaningful amount left
      const remaining = duration - time
      const h = Math.floor(remaining / 3600)
      const m = Math.floor((remaining % 3600) / 60)
      if (h > 0) return `${h}h ${m}m left`
      return `${m}m left`
    }
    // If completed or duration is unknown
    const h = Math.floor(time / 3600)
    const m = Math.floor((time % 3600) / 60)
    if (h > 0) return `${h}h ${m}m watched`
    return `${m}m watched`
  }

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
          {items.map((item, i) => {
            const progress = item.duration ? Math.min(100, Math.max(0, (item.time / item.duration) * 100)) : 0
            const url = item.mediaType === 'movie' 
              ? `/watch/${item.id}?type=movie` 
              : `/watch/${item.id}?type=tv&s=${item.season || 1}&e=${item.episode || 1}`
            const poster = item.poster 
              ? `https://image.tmdb.org/t/p/w342${item.poster}` 
              : (item.backdrop ? `https://image.tmdb.org/t/p/w500${item.backdrop}` : null)
            
            return (
              <Link href={url} key={item.key} className={styles.cardWrap}>
                <div className={styles.card}>
                  <div className={styles.poster}>
                    {poster ? (
                      <Image 
                        src={poster} 
                        alt={item.title} 
                        fill 
                        className={styles.img} 
                        sizes="(max-width: 640px) 150px, (max-width: 1024px) 175px, 190px" 
                        priority={i < 4}
                      />
                    ) : (
                      <div className={styles.noImg}>🎬</div>
                    )}
                    <button 
                      className={styles.removeBtn} 
                      onClick={(e) => requestRemove(item, e)} 
                      title="Remove from row"
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
                    <h3 className={styles.title} title={item.title}>{item.title}</h3>
                    <div className={styles.meta}>
                      {item.mediaType === 'tv' && <span>S{item.season} E{item.episode} • </span>}
                      <span>{formatTimeLeft(item.time, item.duration)}</span>
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
        description={`Are you sure you want to remove "${itemToRemove?.title}" from your continue watching row?`}
        confirmText="Remove"
        onConfirm={confirmRemove}
        onCancel={() => setItemToRemove(null)}
      />
    </section>
  )
}
