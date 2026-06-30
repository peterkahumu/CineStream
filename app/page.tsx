import HomeHero from '@/components/HomeHero'
import MediaRow from '@/components/MediaRow'
import Top10Row from '@/components/Top10Row'
import {
  getTrending, getPopular, getTopRated, getNowPlaying, getOnAir,
  getUpcomingMovies, getUpcomingTV, getProviderContent,
  discover, MediaItem, TMDBPage,
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

function getThemedCollection(): { title: string, emoji: string, queryParams: any, link: string } {
  // Using fixed date logic based on current server time
  const d = new Date()
  const month = d.getMonth()
  const day = d.getDay() // 0 = Sunday, 5 = Friday, 6 = Saturday

  if (month === 9) return { title: 'Spooky Season Picks', emoji: '🎃', queryParams: { media: 'movie', with_genres: '27' }, link: '/discover?genre=27' }
  if (month === 11) return { title: 'Holiday Warmth', emoji: '🎄', queryParams: { media: 'movie', with_genres: '10751' }, link: '/discover?genre=10751' }
  if (month === 1) return { title: "Valentine's Romance", emoji: '💖', queryParams: { media: 'movie', with_genres: '10749' }, link: '/discover?genre=10749' }
  
  if (day === 5 || day === 6) return { title: 'Weekend Action', emoji: '💥', queryParams: { media: 'movie', with_genres: '28' }, link: '/discover?genre=28' }
  if (day === 0) return { title: 'Sunday Laughs', emoji: '😂', queryParams: { media: 'movie', with_genres: '35' }, link: '/discover?genre=35' }
  
  // Default fallback theme
  return { title: "Editor's Picks", emoji: '🌟', queryParams: { media: 'movie', sort_by: 'vote_average.desc', 'vote_count.gte': '5000' }, link: '/discover?sort=vote_average.desc&minRating=7' }
}

export default async function HomePage() {
  const theme = getThemedCollection()

  const [
    trendingAll, popularMovies, popularTV, topMovies, topTV, nowPlaying, onAir,
    upcomingMovies, upcomingTV,
    netflixM, netflixTV,
    primeM, primeTV,
    disneyM, disneyTV,
    themedRes
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
    getProviderContent(337, 'tv'),
    discover(theme.queryParams as any)
  ])

  const ok = <T,>(r: PromiseSettledResult<TMDBPage<T>>): T[] =>
    r.status === 'fulfilled' ? r.value.results : []

  const heroItems = ok(trendingAll).filter(i => i.backdrop_path).slice(0, 8)
  const themedItems = ok(themedRes)

  return (
    <main>
      <HomeHero 
        items={heroItems} 
        themedItems={themedItems} 
        themeTitle={theme.title} 
        themeEmoji={theme.emoji} 
        themeLink={theme.link} 
      />
      <div className={`page-container ${styles.sections}`}>
        <MediaRow
          title="Trending This Week"
          emoji="🔥"
          items={ok(trendingAll)}
          seeAllHref="/trending"
        />        

        {/* Currently in theatres / on air — dedicated TMDB endpoints */}
        <MediaRow
          title="Now Playing"
          emoji="🎬"
          items={ok(nowPlaying)}
          seeAllHref="/now-playing?media=movie"
          forcedType="movie"
        />
        <MediaRow
          title="Currently On Air"
          emoji="📡"
          items={ok(onAir)}
          seeAllHref="/now-playing?media=tv"
          forcedType="tv"
        />

        <Top10Row />

        {/* Provider rows → dedicated /provider/[id] route */}
        <MediaRow title="New Movies on Netflix" emoji="🔴" items={ok(netflixM)} seeAllHref="/provider/8?media=movie" forcedType="movie" />
        <MediaRow title="New TV Shows on Netflix" emoji="🔴" items={ok(netflixTV)} seeAllHref="/provider/8?media=tv" forcedType="tv" />

        <MediaRow title="New Movies on Prime Video" emoji="🔵" items={ok(primeM)} seeAllHref="/provider/9?media=movie" forcedType="movie" />
        <MediaRow title="New TV Shows on Prime Video" emoji="🔵" items={ok(primeTV)} seeAllHref="/provider/9?media=tv" forcedType="tv" />

        <MediaRow title="New Movies on Disney+" emoji="✨" items={ok(disneyM)} seeAllHref="/provider/337?media=movie" forcedType="movie" />
        <MediaRow title="New TV Shows on Disney+" emoji="✨" items={ok(disneyTV)} seeAllHref="/provider/337?media=tv" forcedType="tv" />

        <MediaRow title="Popular Movies" emoji="🎞️" items={ok(popularMovies)} seeAllHref="/popular?media=movie" forcedType="movie" />
        <MediaRow title="Popular TV Shows" emoji="📺" items={ok(popularTV)} seeAllHref="/popular?media=tv" forcedType="tv" />

        {/* Upcoming → dedicated /upcoming route (same data as homepage rows) */}
        <MediaRow
          title="Coming Soon — Movies"
          emoji="🍿"
          items={ok(upcomingMovies)}
          seeAllHref="/upcoming?media=movie"
          forcedType="movie"
        />
        <MediaRow
          title="Coming Soon — TV Shows"
          emoji="📅"
          items={ok(upcomingTV)}
          seeAllHref="/upcoming?media=tv"
          forcedType="tv"
        />

        <MediaRow title="Top Rated Movies" emoji="⭐" items={ok(topMovies)} seeAllHref="/top-rated?media=movie" forcedType="movie" />
        <MediaRow title="Top Rated TV Shows" emoji="🏆" items={ok(topTV)} seeAllHref="/top-rated?media=tv" forcedType="tv" />
      </div>
    </main>
  )
}
