'use client'

import { useState, useEffect, useRef } from 'react'
import MediaCard from './MediaCard'
import { MediaItem } from '@/lib/tmdb'
import baseStyles from './MediaRow.module.css'
import styles from './Top10Row.module.css'

export default function Top10Row() {
  const [items, setItems] = useState<MediaItem[]>([])
  const [country, setCountry] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const scrollerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function fetchTop10() {
      try {
        const geoRes = await fetch('https://get.geojs.io/v1/ip/geo.json')
        if (!geoRes.ok) throw new Error('Geo failed')
        const geo = await geoRes.json()
        setCountry(geo.country)

        const tmdbRes = await fetch(`/api/tmdb/discover/movie?region=${geo.country_code}&sort_by=popularity.desc&page=1`)
        if (!tmdbRes.ok) throw new Error('TMDB failed')
        const data = await tmdbRes.json()
        
        setItems(data.results.slice(0, 10))
      } catch (err) {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    fetchTop10()
  }, [])

  if (error || (!loading && items.length === 0)) return null

  const scroll = (direction: 'left' | 'right') => {
    if (scrollerRef.current) {
      const { clientWidth } = scrollerRef.current
      const scrollAmount = direction === 'left' ? -clientWidth * 0.75 : clientWidth * 0.75
      scrollerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  return (
    <section className={baseStyles.section}>
      <div className="section-header">
        <h2 className="section-title">
          <span style={{ marginRight: 4 }}>📈</span>
          Top 10 Movies in {country || 'Your Country'} Today
        </h2>
      </div>

      <div className={baseStyles.rowContainer}>
        <button 
          className={`${baseStyles.scrollBtn} ${baseStyles.scrollLeft}`} 
          onClick={() => scroll('left')}
          aria-label="Scroll left"
        >
          ‹
        </button>

        <div className={baseStyles.scroller} ref={scrollerRef}>
          {loading
            ? Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className={`${styles.top10CardWrap}`}>
                  <div className={styles.cardInner}>
                    <div className={`${baseStyles.skeletonCard} skeleton`} />
                  </div>
                </div>
              ))
            : items.map((item, index) => (
                <div key={`top10-${item.id}`} className={styles.top10CardWrap}>
                  <div className={styles.numberContainer}>{index + 1}</div>
                  <div className={styles.cardInner}>
                    <MediaCard item={item} forcedType="movie" />
                  </div>
                </div>
              ))}
        </div>

        <button 
          className={`${baseStyles.scrollBtn} ${baseStyles.scrollRight}`} 
          onClick={() => scroll('right')}
          aria-label="Scroll right"
        >
          ›
        </button>
      </div>
    </section>
  )
}
