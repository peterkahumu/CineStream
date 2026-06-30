import { getProviderContent } from '@/lib/tmdb'
import type { Metadata } from 'next'
import ProviderClient from './ProviderClient'

// Static map of known provider IDs to display names and logos
const PROVIDER_META: Record<number, { name: string; emoji: string; color: string }> = {
  8:   { name: 'Netflix',     emoji: '🔴', color: '#e50914' },
  9:   { name: 'Prime Video', emoji: '🔵', color: '#00a8e1' },
  337: { name: 'Disney+',    emoji: '✨', color: '#113ccf' },
}

export async function generateMetadata(props: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string>>
}): Promise<Metadata> {
  const { id } = await props.params
  const providerId = Number(id)
  const meta = PROVIDER_META[providerId] ?? { name: 'Provider', emoji: '🎬', color: '#000' }
  return {
    title: `New on ${meta.name} | CinemaPhora`,
    description: `Browse the latest movies and TV shows now streaming on ${meta.name}.`,
  }
}

export const revalidate = 3600 // 1 hour

export default async function ProviderPage(props: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string>>
}) {
  const { id } = await props.params
  const searchParams = await props.searchParams
  const providerId = Number(id)
  const meta = PROVIDER_META[providerId] ?? { name: 'Provider', emoji: '🎬', color: '#555' }

  const mediaType = (searchParams.media === 'tv' ? 'tv' : 'movie') as 'movie' | 'tv'

  const data = await getProviderContent(providerId, mediaType).catch(() => ({ results: [], total_pages: 0 }))

  return (
    <main className="page-content">
      <div className="page-container">
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', marginBottom: 4 }}>
            {meta.emoji} New on {meta.name}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Recently added {mediaType === 'tv' ? 'TV shows' : 'movies'} from the last 6 months
          </p>
        </div>

        <ProviderClient
          key={`${id}-${mediaType}`}
          initialItems={data.results}
          totalPages={data.total_pages}
          providerId={providerId}
          mediaType={mediaType}
        />
      </div>
    </main>
  )
}
