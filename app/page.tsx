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
  title: 'CinemaPhora | Your Ultimate Movie & TV Show Hub',
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

export default async function HomePage() {
  const [
    trendingAll, popularMovies, popularTV, topMovies, topTV, nowPlaying, onAir,
    upcomingMovies, upcomingTV,
    netflixM, netflixTV,
    appleM, appleTV,
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
    getProviderContent(8, 'movie'), // Netflix
    getProviderContent(8, 'tv'),
    getProviderContent(350, 'movie'), // Apple TV+
    getProviderContent(350, 'tv'),
    getProviderContent(337, 'movie'), // Disney+
    getProviderContent(337, 'tv')
  ])

  const ok = <T,>(r: PromiseSettledResult<TMDBPage<T>>): T[] =>
    r.status === 'fulfilled' ? r.value.results : []

  const heroItems = ok(trendingAll).filter(i => i.backdrop_path).slice(0, 8)

  return (
    <main>
      <HeroBanner items={heroItems} loading={false} />
      <div className={`page-container ${styles.sections}`}>
        <MediaRow title="Trending This Week" emoji="🔥" items={ok(trendingAll)} seeAllHref="/discover" />

        <Top10Row />

        <MediaRow title="Now Playing" emoji="🎬" items={ok(nowPlaying)} seeAllHref="/discover?media=movie&sort=primary_release_date.desc" forcedType="movie" />
        <MediaRow title="Currently On Air" emoji="📡" items={ok(onAir)} seeAllHref="/discover?media=tv&sort=first_air_date.desc" forcedType="tv" />

        <MediaRow title="New Movies on Netflix" emoji="🔴" items={ok(netflixM)} seeAllHref="/discover?media=movie&with_watch_providers=8" forcedType="movie" />
        <MediaRow title="New TV Shows on Netflix" emoji="🔴" items={ok(netflixTV)} seeAllHref="/discover?media=tv&with_watch_providers=8" forcedType="tv" />

        <MediaRow title="New Movies on Apple TV+" emoji="🍏" items={ok(appleM)} seeAllHref="/discover?media=movie&with_watch_providers=350" forcedType="movie" />
        <MediaRow title="New TV Shows on Apple TV+" emoji="🍏" items={ok(appleTV)} seeAllHref="/discover?media=tv&with_watch_providers=350" forcedType="tv" />

        <MediaRow title="New Movies on Disney+" emoji="✨" items={ok(disneyM)} seeAllHref="/discover?media=movie&with_watch_providers=337" forcedType="movie" />
        <MediaRow title="New TV Shows on Disney+" emoji="✨" items={ok(disneyTV)} seeAllHref="/discover?media=tv&with_watch_providers=337" forcedType="tv" />

        <MediaRow title="Popular Movies" emoji="🎞️" items={ok(popularMovies)} seeAllHref="/discover?media=movie" forcedType="movie" />
        <MediaRow title="Popular TV Shows" emoji="📺" items={ok(popularTV)} seeAllHref="/discover?media=tv" forcedType="tv" />

        <MediaRow title="Upcoming Movies" emoji="🍿" items={ok(upcomingMovies)} seeAllHref="/discover?media=movie&sort=primary_release_date.desc" forcedType="movie" />
        <MediaRow title="Upcoming TV Shows" emoji="📅" items={ok(upcomingTV)} seeAllHref="/discover?media=tv&sort=first_air_date.desc" forcedType="tv" />

        <MediaRow title="Top Rated Movies" emoji="⭐" items={ok(topMovies)} seeAllHref="/discover?media=movie&sort=vote_average.desc" forcedType="movie" />
        <MediaRow title="Top Rated TV Shows" emoji="🏆" items={ok(topTV)} seeAllHref="/discover?media=tv&sort=vote_average.desc" forcedType="tv" />
      </div>
    </main>
  )
}
