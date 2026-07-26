'use client'
import { useState, useCallback } from 'react'
import HeroBanner from './HeroBanner'
import FeaturedStrip from './FeaturedStrip'
import MoodPickerModal from './MoodPickerModal'
import { MediaItem } from '@/lib/tmdb'
import styles from './HomeHero.module.css'

interface Props {
  items: MediaItem[]
  themedItems?: MediaItem[]
  themeTitle?: string
  themeEmoji?: string
  themeLink?: string
}

export default function HomeHero({ items, themedItems, themeTitle, themeEmoji, themeLink }: Props) {
  const [activeIdx, setActiveIdx] = useState(0)
  const [moodOpen, setMoodOpen] = useState(false)

  const handleSlide = useCallback((i: number) => setActiveIdx(i), [])
  const handleOpenMood = useCallback(() => setMoodOpen(true), [])
  const handleCloseMood = useCallback(() => setMoodOpen(false), [])

  return (
    <>
      <HeroBanner items={items} loading={false} activeIdx={activeIdx} onSlide={handleSlide} />
      {themedItems && themedItems.length > 0 && (
        <FeaturedStrip items={themedItems} title={themeTitle} emoji={themeEmoji} link={themeLink} />
      )}

      {/* Mood picker trigger — Prominent banner */}
      <div className={styles.moodSection}>
        <button
          id="mood-picker-btn"
          className={styles.moodBtn}
          onClick={handleOpenMood}
        >
          <span className={styles.moodEmoji}>🎭</span>
          <span>What are you in the mood for?</span>
        </button>
      </div>

      <MoodPickerModal isOpen={moodOpen} onClose={handleCloseMood} />
    </>
  )
}
