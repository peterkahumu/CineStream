import Link from 'next/link'
import WatchClient from './WatchClient'
import ScrollToTop from '@/components/ScrollToTop'
import { getStreamingServers } from '@/lib/streamingProvider'
import {
  getMovieDetails, getTVDetails, getSeasonDetails,
  mediaTitle, backdropUrl
} from '@/lib/tmdb'
import type { Metadata } from 'next'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'

export async function generateMetadata(
  props: { params: Promise<{ id: string }>; searchParams: Promise<{ type?: string; s?: string; e?: string }> }
): Promise<Metadata> {
  const params = await props.params
  const searchParams = await props.searchParams
  const id = params.id
  const mediaType = searchParams.type === 'tv' ? 'tv' : 'movie'
  const season = searchParams.s || '1'
  const episode = searchParams.e || '1'
  
  const details = mediaType === 'movie' 
    ? await getMovieDetails(Number(id)).catch(() => null)
    : await getTVDetails(Number(id)).catch(() => null)

  if (!details) return { title: 'Watch | CinemaPhora' }

  const baseTitle = mediaTitle(details)
  const title = mediaType === 'tv' ? `Watch ${baseTitle} - Season ${season} Episode ${episode}` : `Watch ${baseTitle}`
  const description = details.overview || `Watch ${baseTitle} instantly on CinemaPhora.`

  return {
    title: `${title} | CinemaPhora`,
    description,
    openGraph: {
      title: `${title} | CinemaPhora`,
      description,
    },
    twitter: {
      card: 'summary',
      title: `${title} | CinemaPhora`,
      description,
    }
  }
}

export default async function WatchPage(props: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ type?: string; s?: string; e?: string }>
}) {
  const params = await props.params
  const searchParams = await props.searchParams
  const id = params.id

  const mediaType = searchParams.type === 'tv' ? 'tv' : 'movie'
  const season = Number(searchParams.s || 1)
  const episode = Number(searchParams.e || 1)

  const details = mediaType === 'movie'
    ? await getMovieDetails(Number(id))
    : await getTVDetails(Number(id))

  if (!details) {
    throw new Error('Failed to load media details')
  }

  const title = mediaTitle(details)
  const backdrop = backdropUrl(details.backdrop_path, 'original')
  const seasons = (details.seasons || []).filter((s: any) => s.season_number > 0)

  // Pre-fetch episode data server-side so EpisodeSelector doesn't need useEffect
  let episodes: any[] = []
  if (mediaType === 'tv' && seasons.length > 0) {
    try {
      const seasonData = await getSeasonDetails(Number(id), season)
      episodes = seasonData.episodes || []
    } catch {
      // Gracefully degrade — episode list just won't show
    }
  }

  return (
    <main className={styles.main}>
      <ScrollToTop />
      <div className={styles.container}>
        
        <div className={styles.header}>
          <Link href={`/details/${id}?type=${mediaType}`} className={styles.backBtn}>
            ← Back to Details
          </Link>
          <h1 className={styles.title}>
            {title} {mediaType === 'tv' ? `- Season ${season} Episode ${episode}` : ''}
          </h1>
        </div>

        <div className={styles.layout}>
          <div className={styles.playerWrapper}>
            <WatchClient
              mediaType={mediaType}
              id={id}
              season={season}
              episode={episode}
              title={title}
              backdrop={backdrop}
              servers={getStreamingServers()}
            />
          </div>
        </div>
      </div>
    </main>
  )
}
