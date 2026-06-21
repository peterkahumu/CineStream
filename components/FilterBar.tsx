'use client'
import { useState, useEffect } from 'react'
import { Genre, Country, getMovieGenres, getTVGenres, getCountries } from '@/lib/tmdb'
import styles from './FilterBar.module.css'

export interface FilterState {
  media: 'movie' | 'tv'
  sort_by: string
  genreId: string
  country: string
  year: string
  minRating: string
  language: string
}

interface Props {
  filters: FilterState
  onChange: (f: FilterState) => void
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

export default function FilterBar({ filters, onChange }: Props) {
  const [genres, setGenres] = useState<Genre[]>([])
  const [countries, setCountries] = useState<Country[]>([])
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const fetchFn = filters.media === 'movie' ? getMovieGenres : getTVGenres
    fetchFn().then(d => setGenres(d.genres)).catch(console.error)
    getCountries().then(d => setCountries(d.sort((a, b) => a.english_name.localeCompare(b.english_name)))).catch(console.error)
  }, [filters.media])

  const set = (key: keyof FilterState, value: string) =>
    onChange({ ...filters, [key]: value })

  const reset = () => onChange({
    media: 'movie', sort_by: 'popularity.desc',
    genreId: '', country: '', year: '', minRating: '', language: '',
  })

  const sortOptions = filters.media === 'movie' ? SORT_OPTIONS : SORT_TV
  const hasFilters = filters.genreId || filters.country || filters.year || filters.minRating || filters.language

  return (
    <div className={`${styles.bar} glass`}>
      {/* Primary row — always visible */}
      <div className={styles.primary}>
        {/* Media type toggle */}
        <div className={styles.typeToggle}>
          <button
            className={`${styles.typeBtn} ${filters.media === 'movie' ? styles.typeBtnActive : ''}`}
            onClick={() => set('media', 'movie')}
          >
            🎬 Movies
          </button>
          <button
            className={`${styles.typeBtn} ${filters.media === 'tv' ? styles.typeBtnActive : ''}`}
            onClick={() => set('media', 'tv')}
          >
            📺 TV Shows
          </button>
        </div>

        {/* Sort */}
        <div className={styles.selectWrap}>
          <span className={styles.selectIcon}>↕️</span>
          <select
            className={styles.select}
            value={filters.sort_by}
            onChange={e => set('sort_by', e.target.value)}
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
            <select className={styles.select} value={filters.genreId} onChange={e => set('genreId', e.target.value)}>
              <option value="">All Genres</option>
              {genres.map(g => <option key={g.id} value={String(g.id)}>{g.name}</option>)}
            </select>
          </div>

          {/* Country */}
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Country</label>
            <select className={styles.select} value={filters.country} onChange={e => set('country', e.target.value)}>
              <option value="">All Countries</option>
              {countries.slice(0, 80).map(c => (
                <option key={c.iso_3166_1} value={c.iso_3166_1}>{c.english_name}</option>
              ))}
            </select>
          </div>

          {/* Year */}
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Year</label>
            <select className={styles.select} value={filters.year} onChange={e => set('year', e.target.value)}>
              <option value="">Any Year</option>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {/* Min rating */}
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Rating</label>
            <select className={styles.select} value={filters.minRating} onChange={e => set('minRating', e.target.value)}>
              {RATINGS.map(r => <option key={r} value={r}>{RATING_LABELS[r]}</option>)}
            </select>
          </div>

          {/* Language */}
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Language</label>
            <select className={styles.select} value={filters.language} onChange={e => set('language', e.target.value)}>
              {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </div>
        </div>
      )}
    </div>
  )
}
