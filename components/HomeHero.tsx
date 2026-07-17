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

      {/* Mood picker trigger — Prominent banner */}
      <div style={{
        padding: 'var(--space-md) var(--page-gutter, 1.5rem)',
        display: 'flex',
        justifyContent: 'center'
      }}>
        <button
          id="mood-picker-btn"
          onClick={handleOpenMood}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            width: '100%',
            maxWidth: '600px',
            background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.8), rgba(79, 70, 229, 0.8))',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#fff',
            borderRadius: 'var(--radius-lg)',
            padding: '16px 24px',
            fontSize: '1.1rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            fontFamily: 'var(--font-sans)',
            boxShadow: '0 8px 32px rgba(37, 99, 235, 0.2)',
            backdropFilter: 'blur(8px)',
          }}
          onMouseEnter={e => { 
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 12px 40px rgba(37, 99, 235, 0.4)';
          }}
          onMouseLeave={e => { 
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 32px rgba(37, 99, 235, 0.2)';
          }}
        >
          <span style={{ fontSize: '1.4rem' }}>🎭</span>
          <span>What are you in the mood for?</span>
        </button>
      </div>

      <MoodPickerModal isOpen={moodOpen} onClose={handleCloseMood} />
    </>
  )
}

