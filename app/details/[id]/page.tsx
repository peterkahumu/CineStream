import Image from 'next/image'
import Link from 'next/link'
import MediaCard from '@/components/MediaCard'
import MediaRow from '@/components/MediaRow'
import ScrollToTop from '@/components/ScrollToTop'
import {
  getMovieDetails, getTVDetails, getSeasonDetails,
  posterUrl, backdropUrl, mediaTitle,
} from '@/lib/tmdb'
import type { Metadata } from 'next'
import styles from './page.module.css'

export const revalidate = 3600

export async function generateMetadata(
  props: { params: Promise<{ id: string }>; searchParams: Promise<{ type?: string }> }
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
  searchParams: Promise<{ type?: string }>
}) {
  const params = await props.params
  const searchParams = await props.searchParams
  const id = params.id
  const mediaType = searchParams.type === 'tv' ? 'tv' : 'movie'

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
  const reviews = (details.reviews?.results || []).slice(0, 3)

  let trailers: { key: string; name: string; label?: string }[] = []

  if (mediaType === 'tv' && details.seasons) {
    const validSeasons = details.seasons.filter((s: any) => s.season_number > 0)
    
    if (validSeasons.length === 1) {
      try {
        const seasonRes = await getSeasonDetails(Number(id), validSeasons[0].season_number)
        const vids = (seasonRes.videos?.results || []).filter((v: any) => v.site === 'YouTube' && v.type === 'Trailer')
        trailers = vids.slice(0, 3).map((v: any) => ({ key: v.key, name: v.name, label: `${validSeasons[0].name} Trailer` }))
      } catch (e) {
        console.error('Failed to fetch season trailers', e)
      }
    } else if (validSeasons.length > 1) {
      const seasonsToFetch = validSeasons.slice(-5).reverse()
      const seasonData = await Promise.all(
        seasonsToFetch.map((s: any) => getSeasonDetails(Number(id), s.season_number).catch(() => null))
      )

      seasonData.forEach((sd, index) => {
        const season = seasonsToFetch[index]
        const t = (sd?.videos?.results || []).find((v: any) => v.site === 'YouTube' && v.type === 'Trailer')
        if (t) trailers.push({ key: t.key, name: t.name, label: `${season.name} Trailer` })
      })
    }
    
    // Fallback if no season trailers
    if (trailers.length === 0) {
      const vids = (details.videos?.results || []).filter((v: any) => v.site === 'YouTube' && v.type === 'Trailer')
      trailers = vids.slice(0, 2).map((v: any) => ({ key: v.key, name: v.name, label: 'Series Trailer' }))
    }
  } else {
    const vids = (details.videos?.results || []).filter((v: any) => v.site === 'YouTube' && v.type === 'Trailer')
    trailers = vids.slice(0, 2).map((v: any) => ({ key: v.key, name: v.name, label: 'Trailer' }))
  }

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
            <Link 
              href={`/watch/${id}?type=${mediaType}`} 
              className={`btn btn-primary ${styles.watchBtn}`}
            >
              ▶ Watch Now
            </Link>
          </div>
        </div>
      </div>

      {/* ── Cinematic Flex Layout ───────────────────────────────────────────────── */}
      <ScrollToTop />
      <div className={`page-container ${styles.contentWrapper}`}>
        {/* Trailers */}
        <section className={styles.section}>
          <h2 className={styles.sectionH}>Trailers</h2>
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
        </section>

        {/* Seasons */}
        {mediaType === 'tv' && details.seasons && details.seasons.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionH}>Seasons</h2>
            <div className={styles.seasonGrid}>
              {details.seasons.filter((s: any) => s.season_number > 0).map((season: any) => (
                <Link 
                  key={season.id} 
                  href={`/watch/${id}?type=tv&s=${season.season_number}&e=1`}
                  className={styles.seasonCard}
                >
                  <div className={styles.seasonPoster}>
                    {season.poster_path ? (
                      <Image
                        src={`https://image.tmdb.org/t/p/w185${season.poster_path}`}
                        alt={season.name}
                        fill
                        sizes="100px"
                        className={styles.seasonImg}
                      />
                    ) : (
                      <span className={styles.seasonPlaceholder}>📺</span>
                    )}
                  </div>
                  <div className={styles.seasonInfo}>
                    <span className={styles.seasonName}>{season.name}</span>
                    <span className={styles.seasonMeta}>
                      {season.air_date ? season.air_date.slice(0, 4) : ''} • {season.episode_count} Episodes
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Cast */}
        {cast.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionH}>Cast</h2>
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
          </section>
        )}

        {/* Reviews */}
        {reviews.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionH}>Reviews</h2>
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
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <MediaRow
            title="Recommendations"
            emoji="✨"
            items={recommendations}
            forcedType={mediaType}
          />
        )}

        {/* Similar */}
        {similar.length > 0 && (
          <MediaRow
            title="More Like This"
            emoji="🔄"
            items={similar}
            forcedType={mediaType}
          />
        )}
      </div>
    </main>
  )
}
