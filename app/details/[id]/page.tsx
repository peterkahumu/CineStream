import Image from 'next/image'
import Link from 'next/link'
import MediaCard from '@/components/MediaCard'
import {
  getMovieDetails, getTVDetails,
  posterUrl, backdropUrl, mediaTitle,
} from '@/lib/tmdb'
import styles from './page.module.css'

export const revalidate = 3600

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

      {/* ── CAST (Light Mode) ───────────────────────────────────────────────── */}
      <div className={`page-container ${styles.content}`}>
        {cast.length > 0 && (
          <section className={styles.section}>
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
                </div>
              ))}
            </div>
          </section>
        )}

        {similar.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionH}>More Like This</h2>
            <div className="media-grid">
              {similar.map((item: any) => (
                <MediaCard key={item.id} item={item} forcedType={mediaType} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
