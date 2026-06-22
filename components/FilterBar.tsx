'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Genre, Country } from '@/lib/tmdb'
import styles from './FilterBar.module.css'

interface Props {
  movieGenres: Genre[]
  tvGenres: Genre[]
  countries: Country[]
}

const SORT_OPTIONS = [
  { value: 'popularity.desc',          label: 'Most Popular' },
  { value: 'vote_average.desc',        label: 'Highest Rated' },
  { value: 'primary_release_date.desc',label: 'Newest First' },
  { value: 'primary_release_date.asc', label: 'Oldest First' },
  { value: 'revenue.desc',             label: 'Top Revenue' },
  { value: 'vote_count.desc',          label: 'Most Voted' },
]

const SORT_TV = [
  { value: 'popularity.desc',        label: 'Most Popular' },
  { value: 'vote_average.desc',      label: 'Highest Rated' },
  { value: 'first_air_date.desc',    label: 'Newest First' },
  { value: 'first_air_date.asc',     label: 'Oldest First' },
  { value: 'vote_count.desc',        label: 'Most Voted' },
]

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 40 }, (_, i) => String(CURRENT_YEAR - i))

const RATINGS = ['', '9', '8', '7', '6', '5']
const RATING_LABELS: Record<string, string> = {
  '': 'Any Rating', '9': '9+ ⭐', '8': '8+ ⭐', '7': '7+ ⭐', '6': '6+ ⭐', '5': '5+ ⭐',
}

const LANGUAGES = [
  { code: '', label: 'All Languages' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'fr', label: 'French' },
  { code: 'es', label: 'Spanish' },
  { code: 'de', label: 'German' },
  { code: 'zh', label: 'Chinese' },
  { code: 'hi', label: 'Hindi' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'it', label: 'Italian' },
]

export default function FilterBar({ movieGenres, tvGenres, countries }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [expanded, setExpanded] = useState(false)

  const media = (searchParams.get('media') as 'movie' | 'tv') || 'movie'
  const sort_by = searchParams.get('sort') || 'popularity.desc'
  const genreId = searchParams.get('genre') || ''
  const country = searchParams.get('country') || ''
  const year = searchParams.get('year') || ''
  const minRating = searchParams.get('minRating') || ''
  const language = searchParams.get('language') || ''

  const genres = media === 'movie' ? movieGenres : tvGenres
  const sortOptions = media === 'movie' ? SORT_OPTIONS : SORT_TV
  const hasFilters = genreId || country || year || minRating || language

  const setFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    
    // Always reset to page 1 when changing filters
    params.delete('page')
    
    // If we changed media, we should probably reset genre since IDs don't match
    if (key === 'media') {
      params.delete('genre')
      // Reset sort if the new media type doesn't support the current sort
      if (value === 'tv' && params.get('sort') === 'revenue.desc') {
        params.delete('sort')
      }
    }
    
    router.push(`/discover?${params.toString()}`)
  }

  const reset = () => {
    router.push(`/discover?media=movie&sort=popularity.desc`)
  }

  return (
    <div className={`${styles.bar} glass`}>
      {/* Primary row — always visible */}
      <div className={styles.primary}>
        {/* Media type toggle */}
        <div className={styles.typeToggle}>
          <button
            className={`${styles.typeBtn} ${media === 'movie' ? styles.typeBtnActive : ''}`}
            onClick={() => setFilter('media', 'movie')}
          >
            🎬 Movies
          </button>
          <button
            className={`${styles.typeBtn} ${media === 'tv' ? styles.typeBtnActive : ''}`}
            onClick={() => setFilter('media', 'tv')}
          >
            📺 TV Shows
          </button>
        </div>

        {/* Sort */}
        <div className={styles.selectWrap}>
          <span className={styles.selectIcon}>↕️</span>
          <select
            className={styles.select}
            value={sort_by}
            onChange={e => setFilter('sort', e.target.value)}
          >
            {sortOptions.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* More filters toggle */}
        <button
          className={`${styles.moreBtn} ${expanded ? styles.moreBtnActive : ''}`}
          onClick={() => setExpanded(e => !e)}
        >
          ⚡ Filters {hasFilters && <span className={styles.filterCount}>•</span>}
          <span className={styles.chevron}>{expanded ? '▲' : '▼'}</span>
        </button>

        {hasFilters && (
          <button className={styles.resetBtn} onClick={reset}>✕ Reset</button>
        )}
      </div>

      {/* Secondary row — expanded filters */}
      {expanded && (
        <div className={styles.secondary}>
          {/* Genre */}
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Genre</label>
            <select className={styles.select} value={genreId} onChange={e => setFilter('genre', e.target.value)}>
              <option value="">All Genres</option>
              {genres.map(g => <option key={g.id} value={String(g.id)}>{g.name}</option>)}
            </select>
          </div>

          {/* Country */}
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Country</label>
            <select className={styles.select} value={country} onChange={e => setFilter('country', e.target.value)}>
              <option value="">All Countries</option>
              {countries.map(c => (
                <option key={c.iso_3166_1} value={c.iso_3166_1}>{c.english_name}</option>
              ))}
            </select>
          </div>

          {/* Year */}
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Year</label>
            <select className={styles.select} value={year} onChange={e => setFilter('year', e.target.value)}>
              <option value="">Any Year</option>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {/* Min rating */}
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Rating</label>
            <select className={styles.select} value={minRating} onChange={e => setFilter('minRating', e.target.value)}>
              {RATINGS.map(r => <option key={r} value={r}>{RATING_LABELS[r]}</option>)}
            </select>
          </div>

          {/* Language */}
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Language</label>
            <select className={styles.select} value={language} onChange={e => setFilter('language', e.target.value)}>
              {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </div>
        </div>
      )}
    </div>
  )
}
