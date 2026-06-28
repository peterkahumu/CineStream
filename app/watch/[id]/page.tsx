import Link from 'next/link'
import EpisodeSelector from '@/components/EpisodeSelector'
import WatchClient from './WatchClient'
import { getStreamingServers } from '@/lib/streamingProvider'
import {
  getMovieDetails, getTVDetails, getSeasonDetails,
  mediaTitle,
} from '@/lib/tmdb'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'

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
      <div className={`page-container ${styles.container}`}>
        
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
              servers={getStreamingServers()}
            />

            {/* TV episode quick nav */}
            {mediaType === 'tv' && (
              <div className={styles.quickEp}>
                <span className={styles.quickLabel}>
                  📺 Season {season}, Episode {episode}
                </span>
                <div className={styles.epNav}>
                  {(season > 1 || episode > 1) && (
                    <Link
                      href={`/watch/${id}?type=tv&s=${episode > 1 ? season : season - 1}&e=${episode > 1 ? episode - 1 : 1}`}
                      className={`btn btn-secondary ${styles.epNavBtn}`}
                    >
                      ← Prev
                    </Link>
                  )}
                  <Link
                    href={`/watch/${id}?type=tv&s=${season}&e=${episode + 1}`}
                    className={`btn btn-secondary ${styles.epNavBtn}`}
                  >
                    Next →
                  </Link>
                </div>
              </div>
            )}
          </div>
          
          {/* Sidebar — episodes pre-fetched server-side */}
          {mediaType === 'tv' && seasons.length > 0 && (
            <aside className={styles.sidebar}>
              <EpisodeSelector
                seasons={seasons}
                tvId={Number(id)}
                activeSeason={season}
                activeEpisode={episode}
                episodes={episodes}
              />
            </aside>
          )}
        </div>
      </div>
    </main>
  )
}
