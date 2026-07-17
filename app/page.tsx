import HomeHero from '@/components/HomeHero'
import MediaRow from '@/components/MediaRow'
import Top10Row from '@/components/Top10Row'
import ContinueWatchingRow from '@/components/ContinueWatchingRow'
import {
  getTrending, getPopular, getTopRated, getNowPlaying, getOnAir,
  getUpcomingMovies, getUpcomingTV, getProviderContent,
  discover, TMDBPage,
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
    themedRes,
    hiddenGemsMovies, hiddenGemsTV,
    bingeTV,
    returningTV,
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
    getProviderContent(9, 'movie'),   // Prime Video
    getProviderContent(9, 'tv'),
    getProviderContent(337, 'movie'), // Disney+
    getProviderContent(337, 'tv'),
    discover(theme.queryParams as import('@/lib/tmdb').DiscoverParams),
    // Hidden Gems — low popularity, high rating (movie)
    discover({ media: 'movie', 'vote_average.gte': 7.5, 'vote_count.gte': 300, 'popularity.lte': 30, sort_by: 'vote_average.desc' }),
    // Hidden Gems — TV
    discover({ media: 'tv', 'vote_average.gte': 7.5, 'vote_count.gte': 200, 'popularity.lte': 20, sort_by: 'vote_average.desc' }),
    // Binge-Worthy TV
    discover({ media: 'tv', 'vote_average.gte': 7.5, 'vote_count.gte': 200, sort_by: 'vote_average.desc' }),
    // Returning Soon — TV shows with status returning
    discover({ media: 'tv', with_status: '0', sort_by: 'popularity.desc' }),
  ])

  const ok = <T,>(r: PromiseSettledResult<TMDBPage<T>>): T[] =>
    r.status === 'fulfilled' ? r.value.results : []

  const heroItems = ok(trendingAll).filter(i => i.backdrop_path).slice(0, 8)
  const themedItems = ok(themedRes)
  // Mix movies + TV for hidden gems (interleave)
  const hiddenGemsRaw = [...ok(hiddenGemsMovies), ...ok(hiddenGemsTV)]
    .sort((a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0))
    .slice(0, 20)
  const bingeItems = ok(bingeTV).slice(0, 16)
  const returningItems = ok(returningTV).slice(0, 16)

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
        <ContinueWatchingRow />
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

        {/* Hidden Gems — low-profile but high-rated, mixed movies + TV */}
        {hiddenGemsRaw.length > 0 && (
          <MediaRow
            title="Hidden Gems"
            emoji="💎"
            items={hiddenGemsRaw}
            seeAllHref="/discover?sort=vote_average.desc&minRating=7.5&maxPopularity=30"
          />
        )}

        {/* Binge-Worthy TV */}
        {bingeItems.length > 0 && (
          <MediaRow
            title="Binge-Worthy TV"
            emoji="📺"
            items={bingeItems}
            seeAllHref="/discover?media=tv&sort=vote_average.desc&minRating=7.5"
            forcedType="tv"
          />
        )}

        {/* Returning Soon — TV shows with upcoming new seasons */}
        {returningItems.length > 0 && (
          <MediaRow
            title="Returning Soon"
            emoji="🔜"
            items={returningItems}
            seeAllHref="/discover?media=tv&status=returning"
            forcedType="tv"
          />
        )}

        {/* Provider rows → dedicated /providers route */}
        <MediaRow title="New Movies on Netflix" emoji="🔴" items={ok(netflixM)} seeAllHref="/providers?with_watch_providers=8&media=movie" forcedType="movie" />
        <MediaRow title="New TV Shows on Netflix" emoji="🔴" items={ok(netflixTV)} seeAllHref="/providers?with_watch_providers=8&media=tv" forcedType="tv" />

        <MediaRow title="New Movies on Prime Video" emoji="🔵" items={ok(primeM)} seeAllHref="/providers?with_watch_providers=9&media=movie" forcedType="movie" />
        <MediaRow title="New TV Shows on Prime Video" emoji="🔵" items={ok(primeTV)} seeAllHref="/providers?with_watch_providers=9&media=tv" forcedType="tv" />

        <MediaRow title="New Movies on Disney+" emoji="✨" items={ok(disneyM)} seeAllHref="/providers?with_watch_providers=337&media=movie" forcedType="movie" />
        <MediaRow title="New TV Shows on Disney+" emoji="✨" items={ok(disneyTV)} seeAllHref="/providers?with_watch_providers=337&media=tv" forcedType="tv" />

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
