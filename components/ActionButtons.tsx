'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import styles from './ActionButtons.module.css'

interface Props {
  id: string
  mediaType: 'movie' | 'tv'
  title: string
  poster: string | null
  backdrop: string | null
}

const WISHLIST_KEY = 'cinemaphora-wishlist'

export default function ActionButtons({ id, mediaType, title, poster, backdrop }: Props) {
  const [inWishlist, setInWishlist] = useState(false)
  const [showToast, setShowToast] = useState(false)

  // Avoid using inline functions in useEffect by wrapping with useCallback if needed,
  // but simple logic can be inside useEffect as long as dependencies are correct.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(WISHLIST_KEY)
      if (stored) {
        const list = JSON.parse(stored)
        setInWishlist(list.some((item: any) => String(item.id) === String(id)))
      }
    } catch (e) {
      console.error('Failed to read wishlist', e)
    }
  }, [id])

  const toggleWishlist = useCallback(() => {
    try {
      const stored = localStorage.getItem(WISHLIST_KEY)
      let list = stored ? JSON.parse(stored) : []
      
      const exists = list.some((item: any) => String(item.id) === String(id))
      
      if (exists) {
        list = list.filter((item: any) => String(item.id) !== String(id))
        setInWishlist(false)
      } else {
        list.push({
          id,
          mediaType,
          title,
          poster,
          backdrop,
          addedAt: Date.now()
        })
        setInWishlist(true)
        setShowToast(true)
        setTimeout(() => setShowToast(false), 3000)
      }
      
      localStorage.setItem(WISHLIST_KEY, JSON.stringify(list))
    } catch (e) {
      console.error('Failed to update wishlist', e)
    }
  }, [id, mediaType, title, poster, backdrop])

  return (
    <div className={styles.actionsContainer}>
      <button 
        className={`${styles.iconBtn} ${inWishlist ? styles.active : ''}`}
        onClick={toggleWishlist}
        title={inWishlist ? "Remove from My List" : "Add to My List"}
        aria-label="Wishlist toggle"
      >
        {inWishlist ? '💖' : '🤍'}
      </button>

      {showToast && (
        <div className={styles.toast}>
          Added to Wishlist!
          <Link href="/wishlist" className={styles.toastLink}>
            View List
          </Link>
        </div>
      )}
    </div>
  )
}
