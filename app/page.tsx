import HeroBanner from '@/components/HeroBanner'
import MediaRow from '@/components/MediaRow'
import {
  getTrending, getPopular, getTopRated, getNowPlaying, getOnAir,
  MediaItem, TMDBPage,
} from '@/lib/tmdb'
import styles from './page.module.css'

export const revalidate = 300 // Revalidate home page every 5 minutes

export default async function HomePage() {
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

  const heroItems = ok(trendingAll).filter(i => i.backdrop_path).slice(0, 8)

  const sections = [
    { key: 'trending', title: 'Trending This Week',  emoji: '🔥', items: ok(trendingAll),   seeAll: '/discover' },
    { key: 'now',      title: 'Now Playing',         emoji: '🎬', items: ok(nowPlaying),    seeAll: '/discover?media=movie&sort=primary_release_date.desc', type: 'movie' as const },
    { key: 'onair',    title: 'Currently On Air',    emoji: '📡', items: ok(onAir),         seeAll: '/discover?media=tv&sort=first_air_date.desc', type: 'tv' as const },
    { key: 'popM',     title: 'Popular Movies',      emoji: '🎞️', items: ok(popularMovies), seeAll: '/discover?media=movie', type: 'movie' as const },
    { key: 'popTV',    title: 'Popular TV Shows',    emoji: '📺', items: ok(popularTV),     seeAll: '/discover?media=tv', type: 'tv' as const },
    { key: 'topM',     title: 'Top Rated Movies',    emoji: '⭐', items: ok(topMovies),     seeAll: '/discover?media=movie&sort=vote_average.desc', type: 'movie' as const },
    { key: 'topTV',    title: 'Top Rated TV Shows',  emoji: '🏆', items: ok(topTV),         seeAll: '/discover?media=tv&sort=vote_average.desc', type: 'tv' as const },
  ]

  return (
    <main>
      <HeroBanner items={heroItems} loading={false} />
      <div className={`page-container ${styles.sections}`}>
        {sections.map(s => (
          <MediaRow
            key={s.key}
            title={s.title}
            emoji={s.emoji}
            items={s.items}
            loading={false}
            seeAllHref={s.seeAll}
            forcedType={s.type}
          />
        ))}
      </div>
    </main>
  )
}
