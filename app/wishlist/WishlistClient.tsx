'use client'

import { useState, useEffect } from 'react'
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
}

const WISHLIST_KEY = 'cinemaphora-wishlist'

export default function WishlistClient() {
  const [items, setItems] = useState<SavedWishlistItem[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const stored = localStorage.getItem(WISHLIST_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as SavedWishlistItem[]
        // Sort by newest added first
        parsed.sort((a, b) => b.addedAt - a.addedAt)
        setItems(parsed)
      }
    } catch (e) {
      console.error('Failed to parse wishlist', e)
    }
  }, [])

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
    <div className={styles.grid}>
      {items.map(item => {
        // Map our simple saved state to a format MediaCard expects
        const mediaItem: MediaItem = {
          id: Number(item.id),
          title: item.title,
          name: item.title,
          poster_path: item.poster,
          backdrop_path: item.backdrop,
          media_type: item.mediaType
        } as MediaItem

        return (
          <div key={item.id} style={{ position: 'relative' }}>
            <MediaCard item={mediaItem} forcedType={item.mediaType} />
          </div>
        )
      })}
    </div>
  )
}
