import Image from 'next/image'
import Link from 'next/link'
import MediaCard from '@/components/MediaCard'
import MediaRow from '@/components/MediaRow'
import ScrollToTop from '@/components/ScrollToTop'
import DetailsTabs from '@/components/DetailsTabs'
import EpisodeSelector from '@/components/EpisodeSelector'
import {
  getMovieDetails, getTVDetails, getSeasonDetails,
  posterUrl, backdropUrl, mediaTitle,
} from '@/lib/tmdb'
import type { Metadata } from 'next'
import styles from './page.module.css'

export const revalidate = 3600

export async function generateMetadata(
  props: { params: Promise<{ id: string }>; searchParams: Promise<{ type?: string; tab?: string; s?: string }> }
): Promise<Metadata> {
  const params = await props.params
  const searchParams = await props.searchParams
  const id = params.id
  const mediaType = searchParams.type === 'tv' ? 'tv' : 'movie'
  
  const details = mediaType === 'movie' 
    ? await getMovieDetails(Number(id)).catch(() => null)
    : await getTVDetails(Number(id)).catch(() => null)

  if (!details) return { title: 'Not Found | CinemaPhora' }

  const title = mediaTitle(details)
  const description = details.overview || `Watch ${title} on CinemaPhora.`
  const ogImage = backdropUrl(details.backdrop_path, 'w1280') || posterUrl(details.poster_path, 'w500')

  return {
    title: `${title} | CinemaPhora`,
    description,
    openGraph: {
      title: `${title} | CinemaPhora`,
      description,
      images: ogImage ? [{ url: ogImage }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | CinemaPhora`,
      description,
      images: ogImage ? [ogImage] : [],
    }
  }
}

export default async function DetailsPage(props: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ type?: string; tab?: string; s?: string }>
}) {
  const params = await props.params
  const searchParams = await props.searchParams
  const id = params.id
  const mediaType = searchParams.type === 'tv' ? 'tv' : 'movie'
  
  // Enforce valid tab types
  const tabRaw = searchParams.tab || (mediaType === 'tv' ? 'watch' : 'trailers')
  const tab: 'watch' | 'trailers' | 'cast' | 'reviews' = 
    (tabRaw === 'watch' && mediaType === 'tv') ? 'watch' :
    tabRaw === 'cast' ? 'cast' :
    tabRaw === 'reviews' ? 'reviews' : 'trailers'

  const activeSeason = Number(searchParams.s || 1)

  const details = mediaType === 'movie'
    ? await getMovieDetails(Number(id))
    : await getTVDetails(Number(id))

  if (!details) throw new Error('Failed to load media details')

  const title = mediaTitle(details)
  const backdrop = backdropUrl(details.backdrop_path, 'original')
  const poster = posterUrl(details.poster_path, 'w500')
  const genres = details.genres || []
  const cast = (details.credits?.cast || details.aggregate_credits?.cast || []).slice(0, 12)
  const similar = (details.similar?.results || []).filter((r: any) => r.poster_path).slice(0, 12)
  const recommendations = (details.recommendations?.results || []).filter((r: any) => r.poster_path).slice(0, 12)
  const reviews = (details.reviews?.results || [])

  let trailers: { key: string; name: string; label?: string }[] = []
  let tvSeasons: any[] = []
  let episodes: any[] = []

  if (mediaType === 'tv' && details.seasons) {
    tvSeasons = details.seasons.filter((s: any) => s.season_number > 0)
    
    // Fetch trailers if we are on the trailers tab
    if (tab === 'trailers') {
      if (tvSeasons.length === 1) {
        try {
          const seasonRes = await getSeasonDetails(Number(id), tvSeasons[0].season_number)
          const vids = (seasonRes.videos?.results || []).filter((v: any) => v.site === 'YouTube' && v.type === 'Trailer')
          trailers = vids.slice(0, 3).map((v: any) => ({ key: v.key, name: v.name, label: `${tvSeasons[0].name} Trailer` }))
        } catch (e) {
          console.error('Failed to fetch season trailers', e)
        }
      } else if (tvSeasons.length > 1) {
        const seasonsToFetch = tvSeasons.slice(-5).reverse()
        const seasonData = await Promise.all(
          seasonsToFetch.map((s: any) => getSeasonDetails(Number(id), s.season_number).catch(() => null))
        )

        seasonData.forEach((sd, index) => {
          const season = seasonsToFetch[index]
          const t = (sd?.videos?.results || []).find((v: any) => v.site === 'YouTube' && v.type === 'Trailer')
          if (t) trailers.push({ key: t.key, name: t.name, label: `${season.name} Trailer` })
        })
      }
      
      if (trailers.length === 0) {
        const vids = (details.videos?.results || []).filter((v: any) => v.site === 'YouTube' && v.type === 'Trailer')
        trailers = vids.slice(0, 2).map((v: any) => ({ key: v.key, name: v.name, label: 'Series Trailer' }))
      }
    }

    // Fetch episodes if we are on the watch tab
    if (tab === 'watch') {
      try {
        const seasonData = await getSeasonDetails(Number(id), activeSeason)
        episodes = seasonData.episodes || []
      } catch {
        // gracefully degrade
      }
    }
  } else if (tab === 'trailers') {
    const vids = (details.videos?.results || []).filter((v: any) => v.site === 'YouTube' && v.type === 'Trailer')
    trailers = vids.slice(0, 2).map((v: any) => ({ key: v.key, name: v.name, label: 'Trailer' }))
  }

  // Hoist upcoming detection to component scope so both hero button and DetailsTabs can use it
  // For TV: first_air_date is historical; use next_episode_to_air instead
  const upcomingDateStr = mediaType === 'tv'
    ? (details.next_episode_to_air?.air_date || '')
    : (details.release_date || '')
  const isUpcoming = upcomingDateStr ? new Date(upcomingDateStr) > new Date() : false

  return (
    <main className={styles.main}>
      {/* ── HERO ──────────────────────────────────────────────────── */}
      <div className={styles.hero}>
        {backdrop && (
          <Image src={backdrop} alt={title} fill className={styles.heroBg} sizes="100vw" priority />
        )}
        <div className={styles.gradientBottom} />
        <div className={styles.gradientLeft} />

        <div className={`page-container ${styles.heroContent}`}>
          <nav className={styles.breadcrumb} aria-label="Breadcrumb">
            <Link href="/" className={styles.bcLink}>Home</Link>
            <span className={styles.bcSep}>›</span>
            <Link href={`/discover?media=${mediaType}`} className={styles.bcLink}>
              {mediaType === 'tv' ? 'TV Shows' : 'Movies'}
            </Link>
            <span className={styles.bcSep}>›</span>
            <span className={styles.bcCurrent}>{title}</span>
          </nav>

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

          <h1 className={styles.heroTitle}>{title}</h1>

          {details.tagline && (
            <p className={styles.tagline}>&ldquo;{details.tagline}&rdquo;</p>
          )}

          {details.overview && (
            <p className={styles.overviewHero}>{details.overview}</p>
          )}

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
          
          <div className={styles.actionsRow}>
            {isUpcoming ? (
              <span className={`btn btn-primary ${styles.watchBtn}`} style={{ opacity: 0.8, cursor: 'default' }}>
                📅 Coming {new Date(upcomingDateStr).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
            ) : mediaType === 'movie' ? (
              <Link
                href={`/watch/${id}?type=movie`}
                className={`btn btn-primary ${styles.watchBtn}`}
              >
                ▶ Watch Now
              </Link>
            ) : (
              <Link
                href={`/details/${id}?type=tv&tab=watch&s=1`}
                className={`btn btn-primary ${styles.watchBtn}`}
                replace={true}
                scroll={false}
              >
                ▶ View Episodes
              </Link>
            )}
          </div>
        </div>
      </div>

      <ScrollToTop />

      <div className={`page-container ${styles.contentWrapper}`}>
        <DetailsTabs activeTab={tab} mediaType={mediaType} id={id} isUpcoming={isUpcoming}>

          {/* TAB: CAST */}
          {tab === 'cast' && (
            <div className={styles.tabSection}>
              {cast.length > 0 ? (
                <div className={styles.castGrid}>
                  {cast.map((c: any) => (
                    <Link 
                      key={c.id} 
                      href={`/person/${c.id}`}
                      className={styles.castCard}
                    >
                      <div className={styles.castAvatar}>
                        {c.profile_path ? (
                          <Image
                            src={`https://image.tmdb.org/t/p/w185${c.profile_path}`}
                            alt={c.name}
                            fill
                            sizes="68px"
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
                    </Link>
                  ))}
                </div>
              ) : (
                <p>No cast information available.</p>
              )}
            </div>
          )}

          {/* TAB: REVIEWS */}
          {tab === 'reviews' && (
            <div className={styles.tabSection}>
              {reviews.length > 0 ? (
                <>
                  <div className={styles.reviewGrid}>
                    {reviews.map((review: any) => (
                      <div key={review.id} className={styles.reviewCard}>
                        <div className={styles.reviewHeader}>
                          <span className={styles.reviewAuthor}>{review.author}</span>
                          {review.author_details?.rating && (
                            <span className={styles.reviewRating}>⭐ {review.author_details.rating.toFixed(1)}</span>
                          )}
                        </div>
                        <p className={styles.reviewContent}>{review.content}</p>
                        <a href={`https://www.themoviedb.org/review/${review.id}`} target="_blank" rel="noopener noreferrer" className={styles.fullReviewLink}>
                          Read full review ↗
                        </a>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 'var(--space-lg)', textAlign: 'center' }}>
                    <a href={`https://www.themoviedb.org/${mediaType}/${id}/reviews`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                      See all reviews on TMDB ↗
                    </a>
                  </div>
                </>
              ) : (
                <p>No reviews available yet.</p>
              )}
            </div>
          )}

          {/* TAB: WATCH (TV Only) */}
          {tab === 'watch' && mediaType === 'tv' && (
            <div className={styles.tabSection}>
              <EpisodeSelector
                seasons={tvSeasons}
                tvId={Number(id)}
                activeSeason={activeSeason}
                activeEpisode={0}
                episodes={episodes}
              />
            </div>
          )}

          {/* TAB: TRAILERS */}
          {tab === 'trailers' && (
            <div className={styles.tabSection}>
              {trailers.length > 0 ? (
                <div className={styles.trailerGrid}>
                  {trailers.map((trailer: any) => (
                    <div key={trailer.key} className={styles.trailerCard}>
                      {trailer.label && <div className={styles.trailerLabel}>{trailer.label}</div>}
                      <div className={styles.trailerWrapper}>
                        <iframe
                          className={styles.trailerIframe}
                          src={`https://www.youtube.com/embed/${trailer.key}`}
                          title={trailer.name}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.noTrailers}>No trailers available for this title.</p>
              )}
            </div>
          )}
        </DetailsTabs>

        {/* RECOMMENDATIONS (Always visible) */}
        <div style={{ marginTop: 'var(--space-2xl)' }}>
          {recommendations.length > 0 && (
            <MediaRow
              title="Recommendations"
              emoji="✨"
              items={recommendations}
              forcedType={mediaType}
            />
          )}

          {similar.length > 0 && (
            <MediaRow
              title="More Like This"
              emoji="🔄"
              items={similar}
              forcedType={mediaType}
            />
          )}
        </div>
      </div>
    </main>
  )
}
