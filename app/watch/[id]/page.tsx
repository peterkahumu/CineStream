import Link from 'next/link'
import WatchClient from './WatchClient'
import ScrollToTop from '@/components/ScrollToTop'
import { getStreamingServers } from '@/lib/streamingProvider'
import {
  getMovieDetails, getTVDetails,
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

  if (!details) return { title: 'Watch' }

  const baseTitle = mediaTitle(details)
  const title = mediaType === 'tv' ? `Watch ${baseTitle} - Season ${season} Episode ${episode}` : `Watch ${baseTitle}`
  const description = details.overview || `Watch ${baseTitle} instantly on CinemaPhora.`

  return {
    title: `${title}`,
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
  const poster = details.poster_path ?? null




  return (
    <main className={styles.main}>
      <ScrollToTop />
      <div className={styles.container}>
        {/*
          WatchClient renders its own .playerWrapper around the stage and the
          controls panel. Wrapping it in a second one put the page header inside
          a centring flex container it was never meant to be in.
        */}
        <div className={styles.layout}>
          <WatchClient
            mediaType={mediaType}
            id={id}
            season={season}
            episode={episode}
            title={title}
            backdrop={backdrop}
            poster={poster}
            genres={details.genres}
            servers={getStreamingServers()}
            airing={mediaType === 'tv' ? {
              seasons: details.seasons,
              last_episode_to_air: details.last_episode_to_air,
              next_episode_to_air: details.next_episode_to_air,
              status: details.status,
              in_production: details.in_production,
            } : undefined}
          />
        </div>
      </div>
    </main>
  )
}
