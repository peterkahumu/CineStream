import Image from 'next/image'
import Link from 'next/link'
import EpisodeSelector from '@/components/EpisodeSelector'
import MediaCard from '@/components/MediaCard'
import WatchClient from './WatchClient'
import {
  getMovieDetails, getTVDetails, getSeasonDetails,
  posterUrl, backdropUrl, mediaTitle,
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
  const backdrop = backdropUrl(details.backdrop_path, 'w1280')
  const poster = posterUrl(details.poster_path, 'w342')
  const genres = details.genres || []
  const cast = (details.credits?.cast || details.aggregate_credits?.cast || []).slice(0, 12)
  const similar = (details.similar?.results || []).filter((r: any) => r.poster_path).slice(0, 12)
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
    <main>
      {/* Slim backdrop strip */}
      {backdrop && (
        <div className={styles.backdropStrip}>
          <Image src={backdrop} alt={title} fill className={styles.backdropImg} sizes="100vw" priority />
          <div className={styles.backdropOverlay} />
        </div>
      )}

      <div className={`page-container ${styles.main}`}>
        {/* Player — client component for server switching */}
        <WatchClient
          mediaType={mediaType}
          id={id}
          season={season}
          episode={episode}
          title={title}
        />

        {/* TV episode quick nav */}
        {mediaType === 'tv' && (
          <div className={`${styles.quickEp} card`}>
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

        {/* Main layout */}
        <div className={styles.layout}>
          <div className={styles.mainCol}>
            {/* Title block */}
            <div className={styles.titleRow}>
              {poster && (
                <div className={styles.miniPoster}>
                  <Image src={poster} alt={title} fill className={styles.posterImg} sizes="100px" priority />
                </div>
              )}
              <div className={styles.titleMeta}>
                <nav className={styles.breadcrumb} aria-label="Breadcrumb">
                  <Link href="/" className={styles.bcLink}>Home</Link>
                  <span className={styles.bcSep}>›</span>
                  <Link href={`/discover?media=${mediaType}`} className={styles.bcLink}>
                    {mediaType === 'tv' ? 'TV Shows' : 'Movies'}
                  </Link>
                  <span className={styles.bcSep}>›</span>
                  <span className={styles.bcCurrent}>{title}</span>
                </nav>

                <h1 className={styles.showTitle}>{title}</h1>

                <div className={styles.metaRow}>
                  {(details.release_date || details.first_air_date) && (
                    <span className={styles.metaChip}>
                      {(details.release_date || details.first_air_date || '').slice(0, 4)}
                    </span>
                  )}
                  {details.vote_average > 0 && (
                    <span className={`${styles.metaChip} ${styles.ratingChip}`}>
                      ★ {details.vote_average.toFixed(1)}
                    </span>
                  )}
                  {details.runtime && (
                    <span className={styles.metaChip}>{details.runtime} min</span>
                  )}
                  {details.number_of_seasons && (
                    <span className={styles.metaChip}>
                      {details.number_of_seasons} season{details.number_of_seasons > 1 ? 's' : ''}
                    </span>
                  )}
                  {details.status && (
                    <span className={`${styles.metaChip} ${styles.statusChip}`}>{details.status}</span>
                  )}
                </div>

                {genres.length > 0 && (
                  <div className={styles.genres}>
                    {genres.map((g: any) => (
                      <Link
                        key={g.id}
                        href={`/discover?media=${mediaType}&genre=${g.id}`}
                        className={styles.genreTag}
                      >
                        {g.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {details.tagline && (
              <p className={styles.tagline}>&ldquo;{details.tagline}&rdquo;</p>
            )}

            {details.overview && (
              <div className={styles.section}>
                <h2 className={styles.sectionH}>Overview</h2>
                <p className={styles.overview}>{details.overview}</p>
              </div>
            )}

            {cast.length > 0 && (
              <div className={styles.section}>
                <h2 className={styles.sectionH}>Cast</h2>
                <div className={styles.castGrid}>
                  {cast.map((c: any) => (
                    <div key={c.id} className={styles.castCard}>
                      <div className={styles.castAvatar}>
                        {c.profile_path ? (
                          <Image
                            src={`https://image.tmdb.org/t/p/w185${c.profile_path}`}
                            alt={c.name}
                            fill
                            sizes="64px"
                            className={styles.castImg}
                          />
                        ) : (
                          <span className={styles.castPlaceholder}>👤</span>
                        )}
                      </div>
                      <div className={styles.castInfo}>
                        <span className={styles.castName}>{c.name}</span>
                        {c.character && <span className={styles.castChar}>{c.character}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {similar.length > 0 && (
              <div className={styles.section}>
                <h2 className={styles.sectionH}>More Like This</h2>
                <div className="media-grid">
                  {similar.map((item: any) => (
                    <MediaCard key={item.id} item={item} forcedType={mediaType} />
                  ))}
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
