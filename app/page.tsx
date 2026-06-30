import HeroBanner from '@/components/HeroBanner'
import MediaRow from '@/components/MediaRow'
import Top10Row from '@/components/Top10Row'
import {
  getTrending, getPopular, getTopRated, getNowPlaying, getOnAir,
  getUpcomingMovies, getUpcomingTV, getProviderContent,
  MediaItem, TMDBPage,
} from '@/lib/tmdb'
import type { Metadata } from 'next'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'CinemaPhora',
  description: 'Discover trending movies, popular TV shows, and watch instantly on CinemaPhora.',
  openGraph: {
    title: 'CinemaPhora | Your Ultimate Movie & TV Show Hub',
    description: 'Discover trending movies, popular TV shows, and watch instantly on CinemaPhora.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CinemaPhora | Your Ultimate Movie & TV Show Hub',
    description: 'Discover trending movies, popular TV shows, and watch instantly on CinemaPhora.',
  }
}

export const revalidate = 300 // Revalidate home page every 5 minutes

// Helper: compute today and 3-months-out date strings for upcoming rows
function getUpcomingDateRange() {
  const today = new Date()
  const future = new Date()
  future.setMonth(future.getMonth() + 3)
  return {
    todayStr: today.toISOString().split('T')[0],
    futureStr: future.toISOString().split('T')[0],
  }
}

export default async function HomePage() {
  const [
    trendingAll, popularMovies, popularTV, topMovies, topTV, nowPlaying, onAir,
    upcomingMovies, upcomingTV,
    netflixM, netflixTV,
    primeM, primeTV,
    disneyM, disneyTV
  ] = await Promise.allSettled([
    getTrending('all', 'week'),
    getPopular('movie'),
    getPopular('tv'),
    getTopRated('movie'),
    getTopRated('tv'),
    getNowPlaying(),
    getOnAir(),
    getUpcomingMovies(),
    getUpcomingTV(),
    getProviderContent(8, 'movie'),   // Netflix
    getProviderContent(8, 'tv'),
    getProviderContent(9, 'movie'),   // Prime Video (US)
    getProviderContent(9, 'tv'),
    getProviderContent(337, 'movie'), // Disney+
    getProviderContent(337, 'tv')
  ])

  const ok = <T,>(r: PromiseSettledResult<TMDBPage<T>>): T[] =>
    r.status === 'fulfilled' ? r.value.results : []

  const heroItems = ok(trendingAll).filter(i => i.backdrop_path).slice(0, 8)

  const { todayStr, futureStr } = getUpcomingDateRange()

  return (
    <main>
      <HeroBanner items={heroItems} loading={false} />
      <div className={`page-container ${styles.sections}`}>
        <MediaRow
          title="Trending This Week"
          emoji="🔥"
          items={ok(trendingAll)}
          seeAllHref="/trending"
        />

        <Top10Row />

        {/* Currently in theatres / on air — dedicated TMDB endpoints */}
        <MediaRow
          title="Now Playing"
          emoji="🎬"
          items={ok(nowPlaying)}
          seeAllHref="/discover?media=movie&sort=popularity.desc&vote_count.gte=10"
          forcedType="movie"
        />
        <MediaRow
          title="Currently On Air"
          emoji="📡"
          items={ok(onAir)}
          seeAllHref="/discover?media=tv&sort=popularity.desc"
          forcedType="tv"
        />

        {/* Provider rows → dedicated /provider/[id] route */}
        <MediaRow title="New Movies on Netflix" emoji="🔴" items={ok(netflixM)} seeAllHref="/provider/8?media=movie" forcedType="movie" />
        <MediaRow title="New TV Shows on Netflix" emoji="🔴" items={ok(netflixTV)} seeAllHref="/provider/8?media=tv" forcedType="tv" />

        <MediaRow title="New Movies on Prime Video" emoji="🔵" items={ok(primeM)} seeAllHref="/provider/9?media=movie" forcedType="movie" />
        <MediaRow title="New TV Shows on Prime Video" emoji="🔵" items={ok(primeTV)} seeAllHref="/provider/9?media=tv" forcedType="tv" />

        <MediaRow title="New Movies on Disney+" emoji="✨" items={ok(disneyM)} seeAllHref="/provider/337?media=movie" forcedType="movie" />
        <MediaRow title="New TV Shows on Disney+" emoji="✨" items={ok(disneyTV)} seeAllHref="/provider/337?media=tv" forcedType="tv" />

        <MediaRow title="Popular Movies" emoji="🎞️" items={ok(popularMovies)} seeAllHref="/discover?media=movie&sort=popularity.desc" forcedType="movie" />
        <MediaRow title="Popular TV Shows" emoji="📺" items={ok(popularTV)} seeAllHref="/discover?media=tv&sort=popularity.desc" forcedType="tv" />

        {/* Upcoming → dedicated /upcoming route (same data as homepage rows) */}
        <MediaRow
          title="Upcoming Movies"
          emoji="🍿"
          items={ok(upcomingMovies)}
          seeAllHref="/upcoming?media=movie"
          forcedType="movie"
        />
        <MediaRow
          title="Upcoming TV Shows"
          emoji="📅"
          items={ok(upcomingTV)}
          seeAllHref="/upcoming?media=tv"
          forcedType="tv"
        />

        <MediaRow title="Top Rated Movies" emoji="⭐" items={ok(topMovies)} seeAllHref="/discover?media=movie&sort=vote_average.desc" forcedType="movie" />
        <MediaRow title="Top Rated TV Shows" emoji="🏆" items={ok(topTV)} seeAllHref="/discover?media=tv&sort=vote_average.desc" forcedType="tv" />
      </div>
    </main>
  )
}
