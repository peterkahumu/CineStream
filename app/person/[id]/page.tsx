import Image from 'next/image'
import MediaCard from '@/components/MediaCard'
import { getPersonDetails, posterUrl } from '@/lib/tmdb'
import type { Metadata } from 'next'
import styles from './page.module.css'

export const revalidate = 3600

export async function generateMetadata(
  props: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const params = await props.params
  const id = params.id
  
  const person = await getPersonDetails(Number(id)).catch(() => null)

  if (!person) return { title: 'Person Not Found' }

  const title = person.name
  const description = person.biography || `Discover movies and TV shows starring ${person.name}.`
  const ogImage = posterUrl(person.profile_path, 'w500')

  return {
    title: `${title}`,
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

export default async function PersonPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const id = params.id

  const person = await getPersonDetails(Number(id))

  if (!person) {
    throw new Error('Failed to load person details')
  }

  const profileImg = posterUrl(person.profile_path, 'w500')
  
  // Get combined credits and sort by popularity or release date
  const rawCredits = person.combined_credits?.cast || []
  
  // Filter out items without posters and sort by popularity to show best works first
  const credits = rawCredits
    .filter(item => item.poster_path)
    .sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0))
    // Dedup by id in case an actor plays multiple roles in the same show
    .filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i)
    .slice(0, 30) // Show top 30 works

  return (
    <main className={styles.main}>
      <div className={`page-container ${styles.container}`}>
        
        {/* Sidebar: Profile Image & Personal Info */}
        <aside className={styles.sidebar}>
          <div className={styles.imageWrapper}>
            {profileImg ? (
              <Image 
                src={profileImg} 
                alt={person.name} 
                fill 
                sizes="(max-width: 1024px) 100vw, 300px"
                className={styles.image}
                priority
              />
            ) : (
              <div className={styles.placeholder}>👤</div>
            )}
          </div>
          
          <div className={styles.personalInfo}>
            <h3 className={styles.sectionTitle}>Personal Info</h3>
            
            <div className={styles.infoBlock}>
              <span className={styles.infoLabel}>Known For</span>
              <span className={styles.infoValue}>{person.known_for_department}</span>
            </div>

            {person.birthday && (
              <div className={styles.infoBlock}>
                <span className={styles.infoLabel}>Born</span>
                <span className={styles.infoValue}>
                  {person.birthday}
                  {person.deathday ? ` (Died: ${person.deathday})` : ''}
                </span>
              </div>
            )}

            {person.place_of_birth && (
              <div className={styles.infoBlock}>
                <span className={styles.infoLabel}>Place of Birth</span>
                <span className={styles.infoValue}>{person.place_of_birth}</span>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content: Name, Bio, Credits */}
        <div className={styles.content}>
          <div className={styles.header}>
            <h1 className={styles.name}>{person.name}</h1>
          </div>

          {person.biography && (
            <section className={styles.bioSection}>
              <h2 className={styles.sectionTitle}>Biography</h2>
              <p className={styles.biography}>{person.biography}</p>
            </section>
          )}

          {credits.length > 0 && (
            <section className={styles.creditsSection}>
              <h2 className={styles.sectionTitle}>Known For</h2>
              <div className={styles.creditsGrid}>
                {credits.map((item: any) => (
                  <MediaCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          )}
        </div>

      </div>
    </main>
  )
}
