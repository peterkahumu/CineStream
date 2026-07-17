'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import MediaCard from '@/components/MediaCard'
import { MediaItem } from '@/lib/tmdb'
import styles from './WishlistClient.module.css'

interface SavedWishlistItem {
  id: string
  mediaType: 'movie' | 'tv'
  title: string
  poster: string | null
  backdrop: string | null
  addedAt: number
  watchedAt?: number // Optional timestamp for watched items
}

const WISHLIST_KEY = 'cinemaphora-wishlist'

export default function WishlistClient() {
  const [items, setItems] = useState<SavedWishlistItem[]>([])
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'to-watch' | 'watched'>('all')
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'title-asc'>('date-desc')

  useEffect(() => {
    setMounted(true)
    try {
      const stored = localStorage.getItem(WISHLIST_KEY)
      if (stored) {
        setItems(JSON.parse(stored))
      }
    } catch (e) {
      console.error('Failed to parse wishlist', e)
    }
  }, [])

  const handleToggleWatched = useCallback((id: string, currentlyWatched: boolean) => {
    setItems(prev => {
      const next = prev.map(item => {
        if (item.id === id) {
          return {
            ...item,
            watchedAt: currentlyWatched ? undefined : Date.now()
          }
        }
        return item
      })
      localStorage.setItem(WISHLIST_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const handleRemove = useCallback((id: string) => {
    setItems(prev => {
      const next = prev.filter(i => i.id !== id)
      localStorage.setItem(WISHLIST_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (activeTab === 'all') return true
      if (activeTab === 'watched') return item.watchedAt != null
      return item.watchedAt == null
    })
  }, [items, activeTab])

  const sortedItems = useMemo(() => {
    const list = [...filteredItems]
    list.sort((a, b) => {
      if (sortBy === 'title-asc') {
        return a.title.localeCompare(b.title)
      }
      if (sortBy === 'date-asc') {
        return (a.addedAt || 0) - (b.addedAt || 0)
      }
      return (b.addedAt || 0) - (a.addedAt || 0)
    })
    return list
  }, [filteredItems, sortBy])

  // Stats calculation
  const stats = useMemo(() => {
    const toWatchList = items.filter(i => !i.watchedAt)
    const moviesCount = toWatchList.filter(i => i.mediaType === 'movie').length
    const tvCount = toWatchList.filter(i => i.mediaType === 'tv').length
    // rough estimates: movie=2h, tv=10h (1 season)
    const estimatedHours = (moviesCount * 2) + (tvCount * 10)
    return { count: toWatchList.length, hours: estimatedHours }
  }, [items])

  if (!mounted) {
    return <div style={{ height: '50vh' }} /> // Skeleton or empty space until hydrated
  }

  if (items.length === 0) {
    return (
      <div className={styles.emptyState}>
        <span className={styles.emptyIcon}>🍿</span>
        <h2 className={styles.emptyTitle}>Your list is empty</h2>
        <p className={styles.emptyText}>Save shows and movies to keep track of what you want to watch.</p>
        <Link href="/discover" className="btn btn-primary">
          Discover Content
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className={styles.header}>
        <div className={styles.tabs}>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'all' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All ({items.length})
          </button>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'to-watch' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('to-watch')}
          >
            To Watch ({items.filter(i => !i.watchedAt).length})
          </button>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'watched' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('watched')}
          >
            Watched ({items.filter(i => i.watchedAt).length})
          </button>
        </div>

        <div className={styles.controls}>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as any)}
            className={styles.sortSelect}
          >
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="title-asc">Title (A-Z)</option>
          </select>
        </div>
      </div>

      {activeTab === 'to-watch' && stats.count > 0 && (
        <div className={styles.statsBar}>
          <span><strong>{stats.count}</strong> titles remaining</span>
          <span className={styles.statsDot}>·</span>
          <span>~{stats.hours} hours of watch time</span>
        </div>
      )}

      {sortedItems.length === 0 ? (
        <div className={styles.emptyState} style={{ padding: '4rem 1rem' }}>
          <p className={styles.emptyText}>
            {activeTab === 'watched' 
              ? "You haven't marked anything as watched yet."
              : activeTab === 'all'
                ? "Your list is empty."
                : "You've watched everything on your list!"}
          </p>
        </div>
      ) : (
        <div className={styles.grid}>
          {sortedItems.map(item => {
            const mediaItem: MediaItem = {
              id: Number(item.id),
              title: item.title,
              name: item.title,
              poster_path: item.poster,
              backdrop_path: item.backdrop,
              media_type: item.mediaType
            } as MediaItem

            const isWatched = !!item.watchedAt

            return (
              <div key={item.id} className={styles.cardWrap}>
                <MediaCard item={mediaItem} forcedType={item.mediaType} />
                {activeTab === 'all' && (
                  <div className={`${styles.statusPill} ${isWatched ? styles.statusWatched : styles.statusToWatch}`}>
                    {isWatched ? '✓ Watched' : 'To Watch'}
                  </div>
                )}
                <div className={styles.cardActions}>
                  <button 
                    className={`${styles.actionBtn} ${isWatched ? styles.watchedBtn : ''}`}
                    onClick={() => handleToggleWatched(item.id, isWatched)}
                    title={isWatched ? "Mark as un-watched" : "Mark as watched"}
                  >
                    {isWatched ? '✓ Watched' : 'Mark Watched'}
                  </button>
                  <button 
                    className={styles.removeBtn}
                    onClick={() => handleRemove(item.id)}
                    title="Remove from list"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
