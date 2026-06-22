'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import EpisodeSelector from '@/components/EpisodeSelector'
import MediaCard from '@/components/MediaCard'
import LoadingSpinner from '@/components/LoadingSpinner'
import {
  getMovieDetails, getTVDetails, ShowDetails,
  posterUrl, backdropUrl, mediaTitle,
} from '@/lib/tmdb'
import { buildEmbedUrl, STREAMING_SERVERS } from '@/lib/streamingProvider'
import styles from './page.module.css'

function WatchContent() {
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()

  const typeParam = searchParams.get('type') as 'movie' | 'tv' | null
  const [mediaType] = useState<'movie' | 'tv'>(typeParam || 'movie')
  const [season, setSeason] = useState(Number(searchParams.get('s') || 1))
  const [episode, setEpisode] = useState(Number(searchParams.get('e') || 1))
  const [details, setDetails] = useState<ShowDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [iframeKey, setIframeKey] = useState(0)
  const [server, setServer] = useState(STREAMING_SERVERS[0].id)

  const embedUrl = buildEmbedUrl(server, mediaType, id, season, episode)

  const fetchDetails = useCallback(async () => {
    if (!id) return
    await Promise.resolve() // Defer state update to avoid cascading render in effects
    setLoading(true)
    setError(null)
    try {
      const data = mediaType === 'movie'
        ? await getMovieDetails(Number(id))
        : await getTVDetails(Number(id))
      setDetails(data)
    } catch {
      setError('Failed to load details. Check TMDB_API_KEY in .env.local.')
    } finally {
      setLoading(false)
    }
  }, [id, mediaType])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDetails() 
  }, [fetchDetails])

  const handleEpisodeSelect = (s: number, e: number) => {
    setSeason(s)
    setEpisode(e)
    setIframeKey(k => k + 1)
    router.replace(`/watch/${id}?type=tv&s=${s}&e=${e}`, { scroll: false })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const title = details ? mediaTitle(details) : 'Loading…'
  const backdrop = details ? backdropUrl(details.backdrop_path, 'w1280') : null
  const poster = details ? posterUrl(details.poster_path, 'w342') : null
  const genres = details?.genres || []
  const cast = (details?.credits?.cast || details?.aggregate_credits?.cast || []).slice(0, 12)
  const similar = (details?.similar?.results || []).filter(r => r.poster_path).slice(0, 12)
  const seasons = details?.seasons || []

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
        {/* Player */}
        <div className={styles.playerSection}>
          <div className={styles.playerWrapper}>
            <iframe
              key={`${embedUrl}-${iframeKey}`}
              src={embedUrl}
              className={styles.player}
              allowFullScreen
              loading="lazy"
              title={`${title} player`}
              allow="fullscreen"
            />
          </div>
          
          <div className={styles.serverSelector}>
            <span>If the video fails to load, try switching servers:</span>
            {STREAMING_SERVERS.map(s => (
              <button
                key={s.id}
                className={`btn ${server === s.id ? 'btn-primary' : 'btn-secondary'} ${styles.serverBtn}`}
                onClick={() => { setServer(s.id); setIframeKey(k => k + 1); }}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>

        {/* TV episode quick nav */}
        {mediaType === 'tv' && (
          <div className={`${styles.quickEp} card`}>
            <span className={styles.quickLabel}>
              📺 Season {season}, Episode {episode}
            </span>
            <div className={styles.epNav}>
              <button
                className={`btn btn-secondary ${styles.epNavBtn}`}
                disabled={season === 1 && episode === 1}
                onClick={() => {
                  if (episode > 1) handleEpisodeSelect(season, episode - 1)
                  else if (season > 1) handleEpisodeSelect(season - 1, 1)
                }}
              >
                ← Prev
              </button>
              <button
                className={`btn btn-secondary ${styles.epNavBtn}`}
                onClick={() => handleEpisodeSelect(season, episode + 1)}
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Main layout */}
        <div className={styles.layout}>
          <div className={styles.mainCol}>
            {loading && <LoadingSpinner size="md" text="Loading details…" />}
            {error && <div className={styles.error}>⚠️ {error}</div>}

            {details && (
              <>
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
                        {genres.map(g => (
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
                      {cast.map(c => (
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
                      {similar.map(item => (
                        <MediaCard key={item.id} item={item} forcedType={mediaType} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Sidebar (Moved out of mainCol to fit the CSS grid) */}
          {details && mediaType === 'tv' && seasons.length > 0 && (
            <aside className={styles.sidebar}>
              <EpisodeSelector
                seasons={seasons}
                tvId={Number(id)}
                activeSeason={season}
                activeEpisode={episode}
                onSelect={handleEpisodeSelect}
              />
            </aside>
          )}
        </div>
      </div>
    </main>
  )
}

export default function WatchPage() {
  return (
    <Suspense fallback={<LoadingSpinner size="lg" text="Loading player…" />}>
      <WatchContent />
    </Suspense>
  )
}
