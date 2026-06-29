'use client'

import { useState, useEffect, useRef, Fragment } from 'react'
import MediaCard from './MediaCard'
import { MediaItem } from '@/lib/tmdb'
import baseStyles from './MediaRow.module.css'
import styles from './Top10Row.module.css'

export default function Top10Row() {
  const [movieItems, setMovieItems] = useState<MediaItem[]>([])
  const [tvItems, setTvItems] = useState<MediaItem[]>([])
  const [country, setCountry] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [showToast, setShowToast] = useState(false)
  
  const scrollerMovieRef = useRef<HTMLDivElement>(null)
  const scrollerTvRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function fetchTop10() {
      try {
        const geoRes = await fetch('https://get.geojs.io/v1/ip/geo.json')
        if (!geoRes.ok) throw new Error('Geo failed')
        const geo = await geoRes.json()
        setCountry(geo.country)

        const [movieRes, tvRes] = await Promise.all([
          fetch(`/api/tmdb/discover/movie?region=${geo.country_code}&sort_by=popularity.desc&page=1`),
          fetch(`/api/tmdb/discover/tv?region=${geo.country_code}&sort_by=popularity.desc&page=1`)
        ])
        
        if (!movieRes.ok || !tvRes.ok) throw new Error('TMDB failed')
        
        const movieData = await movieRes.json()
        const tvData = await tvRes.json()
        
        setMovieItems(movieData.results.slice(0, 10))
        setTvItems(tvData.results.slice(0, 10))
        
        setShowToast(true)
        setTimeout(() => setShowToast(false), 5000) // auto dismiss after 5s
      } catch (err) {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    fetchTop10()
  }, [])

  if (error || (!loading && movieItems.length === 0 && tvItems.length === 0)) return null

  const scroll = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
    if (ref.current) {
      const { clientWidth } = ref.current
      const scrollAmount = direction === 'left' ? -clientWidth * 0.75 : clientWidth * 0.75
      ref.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  const renderScroller = (items: MediaItem[], type: 'movie' | 'tv', ref: React.RefObject<HTMLDivElement | null>) => (
    <div className={baseStyles.rowContainer}>
      <button 
        className={`${baseStyles.scrollBtn} ${baseStyles.scrollLeft}`} 
        onClick={() => scroll(ref, 'left')}
        aria-label="Scroll left"
      >
        ‹
      </button>

      <div className={baseStyles.scroller} ref={ref}>
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
                  <MediaCard item={item} forcedType={type} />
                </div>
              </div>
            ))}
      </div>

      <button 
        className={`${baseStyles.scrollBtn} ${baseStyles.scrollRight}`} 
        onClick={() => scroll(ref, 'right')}
        aria-label="Scroll right"
      >
        ›
      </button>
    </div>
  )

  return (
    <>
      <section className={baseStyles.section}>
        <div className="section-header">
          <h2 className="section-title">
            <span style={{ marginRight: 4 }}>📈</span>
            Top 10 Movies in {country} Today
          </h2>
        </div>
        {renderScroller(movieItems, 'movie', scrollerMovieRef)}
      </section>

      <section className={baseStyles.section}>
        <div className="section-header">
          <h2 className="section-title">
            <span style={{ marginRight: 4 }}>📈</span>
            Top 10 TV Shows in {country} Today
          </h2>
        </div>
        {renderScroller(tvItems, 'tv', scrollerTvRef)}
      </section>

      {showToast && (
        <div className={styles.locationToast}>
          📍 Location detected: {country}
          <button onClick={() => setShowToast(false)} aria-label="Dismiss">×</button>
        </div>
      )}
    </>
  )
}
