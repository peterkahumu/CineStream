import { getNowPlaying, getOnAir } from '@/lib/tmdb'
import type { Metadata } from 'next'
import NowPlayingClient from './NowPlayingClient'

export const metadata: Metadata = {
  title: 'Now Playing | CinemaPhora',
  description: 'Movies currently in theatres and TV shows currently on air.',
}

export const revalidate = 900

export default async function NowPlayingPage(props: {
  searchParams: Promise<Record<string, string>>
}) {
  const searchParams = await props.searchParams
  const media = (searchParams.media === 'tv' ? 'tv' : 'movie') as 'movie' | 'tv'

  const data = await (media === 'movie' ? getNowPlaying() : getOnAir())

  return (
    <main className="page-content">
      <div className="page-container">
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', marginBottom: 4 }}>
            {media === 'movie' ? '🎬 Now Playing' : '📡 Currently On Air'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {media === 'movie'
              ? 'Movies currently showing in theatres'
              : 'TV shows currently airing episodes'}
          </p>
        </div>

        <NowPlayingClient
          key={media}
          initialItems={data.results}
          totalPages={data.total_pages}
          media={media}
        />
      </div>
    </main>
  )
}
