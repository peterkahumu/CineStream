'use client'
import { useState } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Genre, Country } from '@/lib/tmdb'
import CustomSelect from '@/components/CustomSelect'
import MultiSelect from '@/components/MultiSelect'
import Modal from '@/components/Modal'
import { useSettings } from '@/components/SettingsProvider'
import { useCountries } from '@/lib/useCountries'
import styles from './FilterBar.module.css'

interface Props {
  movieGenres: Genre[]
  tvGenres: Genre[]
  hideAdvancedFilters?: boolean
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

// We now use dynamic countries and languages from useCountries() hook

export default function FilterBar({ movieGenres, tvGenres, hideAdvancedFilters = false }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const [expanded, setExpanded] = useState(false)
  const [showSavePreset, setShowSavePreset] = useState(false)
  const [showLoadPreset, setShowLoadPreset] = useState(false)
  const [presetName, setPresetName] = useState('')
  const { settings } = useSettings()
  
  const { regions, languages } = useCountries()

  const media = (searchParams.get('media') as 'all' | 'movie' | 'tv') || 'all'
  const sort_by = searchParams.get('sort') || 'popularity.desc'
  const genreId = searchParams.get('genre') || ''
  const country = searchParams.get('country') || ''
  const year = searchParams.get('year') || ''
  const minRating = searchParams.get('minRating') || ''
  const language = searchParams.has('language') ? (searchParams.get('language') || '') : (settings?.language?.split('-')[0] || '')

  const allGenres = [...movieGenres, ...tvGenres].reduce((acc, curr) => {
    if (!acc.find(g => g.id === curr.id)) acc.push(curr)
    return acc
  }, [] as Genre[])

  const genres = media === 'movie' ? movieGenres : media === 'tv' ? tvGenres : allGenres
  const sortOptions = media === 'tv' ? SORT_TV : SORT_OPTIONS
  const hasFilters = genreId || country || year || minRating || language

  const genreValues = genreId ? genreId.split(',') : []
  const countryValues = country ? country.split(',') : []
  const languageValues = language ? language.split(',') : []

  const setMultiFilter = (key: string, values: string[]) => {
    setFilter(key, values.join(','))
  }

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
    
    
    // Maintain q for search page
    if (searchParams.has('q')) params.set('q', searchParams.get('q')!)
    
    router.push(`${pathname}?${params.toString()}`)
  }

  const reset = () => {
    const params = new URLSearchParams()
    if (searchParams.has('q')) params.set('q', searchParams.get('q')!)
    if (searchParams.has('with_watch_providers')) params.set('with_watch_providers', searchParams.get('with_watch_providers')!)
    params.set('media', 'all')
    params.set('sort', 'popularity.desc')
    router.push(`${pathname}?${params.toString()}`)
  }

  const savePreset = () => {
    if (!presetName.trim()) return
    const presets = JSON.parse(localStorage.getItem('cinemaphora-presets') || '[]')
    presets.push({ name: presetName, params: searchParams.toString() })
    localStorage.setItem('cinemaphora-presets', JSON.stringify(presets))
    setShowSavePreset(false)
    setPresetName('')
  }

  const loadPreset = (query: string) => {
    router.push(`${pathname}?${query}`)
    setShowLoadPreset(false)
  }

  const savedPresets = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('cinemaphora-presets') || '[]') : []

  return (
    <div className={`${styles.bar} glass`}>
      {/* Primary row — always visible */}
      <div className={styles.primary}>
        {/* Media type toggle */}
        <div className={styles.typeToggle}>
          <button
            className={`${styles.typeBtn} ${media === 'all' ? styles.typeBtnActive : ''}`}
            onClick={() => setFilter('media', 'all')}
          >
            🌐 All
          </button>
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
          <label className={styles.sortLabel}>Sort By:</label>
          <div style={{ width: '200px', flex: 1 }}>
            <CustomSelect
              value={sort_by}
              options={sortOptions}
              onChange={v => setFilter('sort', v)}
            />
          </div>
        </div>

        {/* More filters toggle */}
        {!hideAdvancedFilters && (
          <button
            className={`${styles.moreBtn} ${expanded ? styles.moreBtnActive : ''}`}
            onClick={() => setExpanded(e => !e)}
          >
            ⚡ Filters {hasFilters && <span className={styles.filterCount}>•</span>}
            <span className={styles.chevron}>{expanded ? '▲' : '▼'}</span>
          </button>
        )}
      </div>

      {/* Secondary row — expanded filters */}
      {expanded && (
        <div className={styles.secondary}>
          {/* Genre */}
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Genre (Multi)</label>
            <MultiSelect
              values={genreValues}
              options={genres.map(g => ({ value: String(g.id), label: g.name }))}
              onChange={v => setMultiFilter('genre', v)}
              placeholder="All Genres"
            />
          </div>

          {/* Country */}
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Country (Multi)</label>
            <MultiSelect
              values={countryValues}
              options={regions.map(r => ({ value: r.code, label: r.name }))}
              onChange={v => setMultiFilter('country', v)}
              placeholder="All Countries"
            />
          </div>

          {/* Year */}
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Year</label>
            <CustomSelect
              value={year}
              options={[
                { value: '', label: 'Any Year' },
                ...YEARS.map(y => ({ value: y, label: y }))
              ]}
              onChange={v => setFilter('year', v)}
            />
          </div>

          {/* Min rating */}
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Rating</label>
            <CustomSelect
              value={minRating}
              options={RATINGS.map(r => ({ value: r, label: RATING_LABELS[r] }))}
              onChange={v => setFilter('minRating', v)}
            />
          </div>

          {/* Language */}
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Language (Multi)</label>
            <MultiSelect
              values={languageValues}
              options={languages.map(l => ({ value: l.code, label: l.name }))}
              onChange={v => setMultiFilter('language', v)}
              placeholder="All Languages"
            />
          </div>
          
        </div>
      )}

      {/* Presets Action (Moved outside grid for full width) */}
      {expanded && (
        <div className={styles.presetRow}>
          <button className={`btn btn-secondary ${styles.presetBtn}`} onClick={() => setShowSavePreset(true)}>💾 Save Preset</button>
          {savedPresets.length > 0 && (
            <button className={`btn btn-secondary ${styles.presetBtn}`} onClick={() => setShowLoadPreset(true)}>📂 Load Preset</button>
          )}
          {hasFilters && (
            <button className={styles.resetBtn} onClick={reset} style={{ marginLeft: 'auto' }}>✕ Reset Filters</button>
          )}
        </div>
      )}

      {/* Save Preset Modal */}
      <Modal 
        isOpen={showSavePreset}
        title="Save Filter Preset"
        description="Name your current filter combination (e.g. 'My Friday Night')"
        confirmText="Save"
        onConfirm={savePreset}
        onCancel={() => setShowSavePreset(false)}
      >
        <input 
          type="text" 
          value={presetName}
          onChange={(e) => setPresetName(e.target.value)}
          placeholder="Preset Name"
          className={styles.modalInput}
          autoFocus
        />
      </Modal>

      {/* Load Preset Modal */}
      <Modal 
        isOpen={showLoadPreset}
        title="Load Filter Preset"
        description="Choose a saved preset to apply."
        confirmText="Close"
        onConfirm={() => setShowLoadPreset(false)}
        hideCancel
      >
        <div className={styles.modalBtnList}>
          {savedPresets.map((p: any, i: number) => (
            <button 
              key={i}
              className={`btn btn-secondary ${styles.modalPresetBtn}`}
              onClick={() => loadPreset(p.params)}
            >
              {p.name}
            </button>
          ))}
        </div>
      </Modal>
    </div>
  )
}
