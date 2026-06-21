'use client'
import { useState, useEffect } from 'react'
import HeroBanner from '@/components/HeroBanner'
import MediaRow from '@/components/MediaRow'
import {
  getTrending, getPopular, getTopRated, getNowPlaying, getOnAir,
  MediaItem, TMDBPage,
} from '@/lib/tmdb'
import styles from './page.module.css'

type Section = {
  key: string
  title: string
  emoji: string
  items: MediaItem[]
  seeAll: string
  type?: 'movie' | 'tv'
}

export default function HomePage() {
  const [heroItems, setHeroItems] = useState<MediaItem[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    setError(null)
    try {
      const [trendingAll, popularMovies, popularTV, topMovies, topTV, nowPlaying, onAir] =
        await Promise.allSettled([
          getTrending('all', 'week'),
          getPopular('movie'),
          getPopular('tv'),
          getTopRated('movie'),
          getTopRated('tv'),
          getNowPlaying(),
          getOnAir(),
        ])

      const ok = <T,>(r: PromiseSettledResult<TMDBPage<T>>): T[] =>
        r.status === 'fulfilled' ? r.value.results : []

      setHeroItems(ok(trendingAll).filter(i => i.backdrop_path).slice(0, 8))

      setSections([
        { key: 'trending', title: 'Trending This Week',  emoji: '🔥', items: ok(trendingAll),   seeAll: '/discover' },
        { key: 'now',      title: 'Now Playing',         emoji: '🎬', items: ok(nowPlaying),    seeAll: '/discover?media=movie&sort=primary_release_date.desc', type: 'movie' },
        { key: 'onair',    title: 'Currently On Air',    emoji: '📡', items: ok(onAir),         seeAll: '/discover?media=tv&sort=first_air_date.desc', type: 'tv' },
        { key: 'popM',     title: 'Popular Movies',      emoji: '🎞️', items: ok(popularMovies), seeAll: '/discover?media=movie', type: 'movie' },
        { key: 'popTV',    title: 'Popular TV Shows',    emoji: '📺', items: ok(popularTV),     seeAll: '/discover?media=tv', type: 'tv' },
        { key: 'topM',     title: 'Top Rated Movies',    emoji: '⭐', items: ok(topMovies),     seeAll: '/discover?media=movie&sort=vote_average.desc', type: 'movie' },
        { key: 'topTV',    title: 'Top Rated TV Shows',  emoji: '🏆', items: ok(topTV),         seeAll: '/discover?media=tv&sort=vote_average.desc', type: 'tv' },
      ])
    } catch {
      setError('Failed to load content. Make sure TMDB_API_KEY is set in your .env.local file.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main>
      {/* Hero */}
      <HeroBanner items={heroItems} loading={loading && heroItems.length === 0} />

      {/* Error banner */}
      {error && (
        <div className={`page-container ${styles.errorBanner}`}>
          <span>⚠️ {error}</span>
          <button className="btn btn-secondary" onClick={fetchAll} style={{ padding: '6px 14px' }}>Retry</button>
        </div>
      )}

      {/* Sections */}
      <div className={`page-container ${styles.sections}`}>
        {sections.map(s => (
          <MediaRow
            key={s.key}
            title={s.title}
            emoji={s.emoji}
            items={s.items}
            loading={loading}
            seeAllHref={s.seeAll}
            forcedType={s.type}
          />
        ))}
      </div>
    </main>
  )
}
