'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import Modal from './Modal'
import styles from './ActionButtons.module.css'

interface Props {
  id: string
  mediaType: 'movie' | 'tv'
  title: string
  poster: string | null
  backdrop: string | null
}

const WISHLIST_KEY = 'cinemaphora-wishlist'

interface WishlistItem {
  id: string
  mediaType: 'movie' | 'tv'
  title: string
  poster: string | null
  backdrop: string | null
  addedAt: number
}

function readWishlistStatus(id: string): boolean {
  try {
    const stored = localStorage.getItem(WISHLIST_KEY)
    if (!stored) return false
    const list: WishlistItem[] = JSON.parse(stored)
    return list.some(item => String(item.id) === String(id))
  } catch (e) {
    console.error('Failed to read wishlist', e)
    return false
  }
}

export default function ActionButtons({ id, mediaType, title, poster, backdrop }: Props) {
  const [inWishlist, setInWishlist] = useState(false)
  const [showWishlistToast, setShowWishlistToast] = useState(false)
  const [showShareToast, setShowShareToast] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const wishlistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const shareTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Clear timers on unmount to prevent state updates on dead components
  useEffect(() => {
    return () => {
      if (wishlistTimerRef.current) clearTimeout(wishlistTimerRef.current)
      if (shareTimerRef.current) clearTimeout(shareTimerRef.current)
    }
  }, [])

  useEffect(() => {
    setInWishlist(readWishlistStatus(id))
  }, [id])


  const toggleWishlist = useCallback(() => {
    try {
      const stored = localStorage.getItem(WISHLIST_KEY)
      let list: WishlistItem[] = stored ? JSON.parse(stored) : []
      
      const exists = list.some(item => String(item.id) === String(id))
      
      if (exists) {
        setIsModalOpen(true)
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
        setShowWishlistToast(true)
        if (wishlistTimerRef.current) clearTimeout(wishlistTimerRef.current)
        wishlistTimerRef.current = setTimeout(() => setShowWishlistToast(false), 3000)
        localStorage.setItem(WISHLIST_KEY, JSON.stringify(list))
      }
    } catch (e) {
      console.error('Failed to update wishlist', e)
    }
  }, [id, mediaType, title, poster, backdrop])

  const confirmRemove = useCallback(() => {
    try {
      const stored = localStorage.getItem(WISHLIST_KEY)
      let list: WishlistItem[] = stored ? JSON.parse(stored) : []
      list = list.filter(item => String(item.id) !== String(id))
      localStorage.setItem(WISHLIST_KEY, JSON.stringify(list))
      setInWishlist(false)
      setIsModalOpen(false)
    } catch (e) {
      console.error('Failed to remove from wishlist', e)
    }
  }, [id])

  const handleShare = useCallback(async () => {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Check out ${title}`,
          text: `I found ${title} on CinemaPhora and thought you might like it!`,
          url: url
        })
      } catch (err) {
        // User might have cancelled the share, fail silently
      }
    } else {
      try {
        await navigator.clipboard.writeText(url)
        setShowShareToast(true)
        if (shareTimerRef.current) clearTimeout(shareTimerRef.current)
        shareTimerRef.current = setTimeout(() => setShowShareToast(false), 3000)
      } catch (err) {
        console.error('Failed to copy', err)
      }
    }
  }, [title])

  return (
    <>
      <div className={styles.actionsContainer}>
        <button 
          className={`${styles.textBtn} ${inWishlist ? styles.removeBtn : styles.addBtn}`}
          onClick={toggleWishlist}
          title={inWishlist ? "Remove from Wishlist" : "Add to Wishlist"}
        >
          {inWishlist ? '✓ Wishlist' : '+ Wishlist'}
        </button>

        <button 
          className={styles.textBtn}
          onClick={handleShare}
          title="Share"
        >
          Share
        </button>

        {showWishlistToast && (
          <div className={styles.toast}>
            Added to Wishlist!
            <Link href="/wishlist" className={styles.toastLink}>
              View List
            </Link>
          </div>
        )}

        {showShareToast && (
          <div className={styles.toast}>
            Copied link to clipboard!
          </div>
        )}
      </div>

      <Modal 
        isOpen={isModalOpen}
        title="Remove from My List"
        description={`Are you sure you want to remove "${title}" from your list?`}
        confirmText="Remove"
        onConfirm={confirmRemove}
        onCancel={() => setIsModalOpen(false)}
      />
    </>
  )
}
