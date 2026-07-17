'use client'
import { useState, useCallback } from 'react'
import HeroBanner from './HeroBanner'
import FeaturedStrip from './FeaturedStrip'
import MoodPickerModal from './MoodPickerModal'
import { MediaItem } from '@/lib/tmdb'

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

      {/* Mood picker trigger — subtle, stays out of the hero flow */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        padding: '0 var(--page-gutter, 1.5rem)',
        marginTop: '-0.5rem',
        marginBottom: '0.5rem',
      }}>
        <button
          id="mood-picker-btn"
          onClick={handleOpenMood}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
            borderRadius: 'var(--radius-full)',
            padding: '6px 16px',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            fontFamily: 'var(--font-sans)',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)' }}
        >
          🎭 Pick a mood
        </button>
      </div>

      <MoodPickerModal isOpen={moodOpen} onClose={handleCloseMood} />
    </>
  )
}

