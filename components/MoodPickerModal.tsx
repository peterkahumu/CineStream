'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import styles from './MoodPickerModal.module.css'

interface Mood {
  emoji: string
  label: string
  description: string
  /** TMDB genre IDs to pass to /discover */
  genreIds: string
  media: 'movie' | 'tv' | 'all'
  /** Optional extra TMDB sort/filter params */
  extra?: Record<string, string>
}

const MOODS: Mood[] = [
  { emoji: '🎭', label: 'Feel-Good',      description: 'Light, warm and uplifting',     genreIds: '35,10751', media: 'all' },
  { emoji: '😱', label: 'Edge of Seat',   description: 'Thrilling, tense, nail-biting', genreIds: '53,27',    media: 'all' },
  { emoji: '😢', label: 'Let It Out',      description: 'Emotionally moving dramas',     genreIds: '18',       media: 'all' },
  { emoji: '🤣', label: 'LOL',             description: 'Pure comedy gold',              genreIds: '35',       media: 'all', extra: { sort_by: 'vote_average.desc' } },
  { emoji: '🤔', label: 'Mind-Bending',   description: 'Sci-fi, mystery, mind trips',   genreIds: '878,9648', media: 'all' },
  { emoji: '❤️', label: 'Romance',         description: 'Love stories to swoon over',   genreIds: '10749',    media: 'all' },
  { emoji: '💥', label: 'Action Rush',    description: 'High-octane action & adventure',genreIds: '28,12',    media: 'all' },
  { emoji: '👨‍👩‍👧', label: 'Family Night',  description: 'Fun for all ages',             genreIds: '10751,16', media: 'all' },
  { emoji: '🌍', label: 'World Cinema',   description: 'Stories from around the globe', genreIds: '',         media: 'movie', extra: { sort_by: 'vote_average.desc', 'vote_count.gte': '500', with_original_language: 'ko,fr,ja,es,it,hi' } },
  { emoji: '🕵️', label: 'Crime & Mystery',description: 'Whodunits & detective stories', genreIds: '80,9648', media: 'all' },
  { emoji: '🧘', label: 'Chill & Slow',   description: 'Gentle pacing, atmospheric',    genreIds: '99,36',    media: 'all' },
  { emoji: '🚀', label: 'Epic Adventure', description: 'Grand journeys & fantasy',      genreIds: '12,14',    media: 'all' },
]

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function MoodPickerModal({ isOpen, onClose }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<Mood | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    if (!isOpen) return
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleKeyDown])

  // Reset selection when modal re-opens
  useEffect(() => {
    if (isOpen) setSelected(null)
  }, [isOpen])

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose()
  }, [onClose])

  const handleDiscover = useCallback(() => {
    if (!selected) return
    const params = new URLSearchParams()
    if (selected.media !== 'all') params.set('media', selected.media)
    if (selected.genreIds) params.set('genre', selected.genreIds)
    if (selected.extra) {
      Object.entries(selected.extra).forEach(([k, v]) => params.set(k, v))
    }
    params.set('sort', 'vote_average.desc')
    router.push(`/discover?${params.toString()}`)
    onClose()
  }, [selected, router, onClose])

  if (!isOpen) return null

  return (
    <div className={styles.overlay} ref={overlayRef} onClick={handleOverlayClick} role="dialog" aria-modal="true" aria-label="Pick a mood">
      <div className={styles.modal}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>How are you feeling tonight?</h2>
            <p className={styles.subtitle}>Pick a mood and we&apos;ll find the perfect watch.</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className={styles.grid}>
          {MOODS.map(mood => (
            <button
              key={mood.label}
              className={`${styles.moodCard} ${selected?.label === mood.label ? styles.moodCardActive : ''}`}
              onClick={() => setSelected(mood)}
            >
              <span className={styles.moodEmoji}>{mood.emoji}</span>
              <span className={styles.moodLabel}>{mood.label}</span>
              <span className={styles.moodDesc}>{mood.description}</span>
            </button>
          ))}
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button
            className={`${styles.discoverBtn} ${!selected ? styles.discoverBtnDisabled : ''}`}
            onClick={handleDiscover}
            disabled={!selected}
          >
            {selected ? `Find ${selected.label} content →` : 'Select a mood first'}
          </button>
        </div>
      </div>
    </div>
  )
}
