'use client'
import { useState, useCallback } from 'react'
import HeroBanner from './HeroBanner'
import FeaturedStrip from './FeaturedStrip'
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

  const handleSlide = useCallback((i: number) => setActiveIdx(i), [])

  return (
    <>
      <HeroBanner items={items} loading={false} activeIdx={activeIdx} onSlide={handleSlide} />
      {themedItems && themedItems.length > 0 && (
        <FeaturedStrip items={themedItems} title={themeTitle} emoji={themeEmoji} link={themeLink} />
      )}
    </>
  )
}
