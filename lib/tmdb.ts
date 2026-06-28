// ─── TMDB via server-side proxy ────────────────────────────────────────────────
// All calls go to /api/tmdb/* — the actual API key lives only in .env.local
// and is never sent to the browser.

export const IMG_BASE = 'https://image.tmdb.org/t/p'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MediaItem {
  id: number
  title?: string
  name?: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  vote_average: number
  vote_count: number
  release_date?: string
  first_air_date?: string
  media_type?: 'movie' | 'tv' | 'person'
  genre_ids?: number[]
  original_language?: string
  popularity?: number
}

export interface Genre { id: number; name: string }
export interface Country { iso_3166_1: string; english_name: string; native_name: string }

export interface Season {
  id: number
  season_number: number
  episode_count: number
  name: string
  overview: string
  poster_path: string | null
  air_date: string | null
}

export interface Episode {
  id: number
  episode_number: number
  season_number: number
  name: string
  overview: string
  still_path: string | null
  air_date: string | null
  vote_average: number
}

export interface CastMember {
  id: number
  name: string
  character: string
  profile_path: string | null
  order: number
}

export interface Review {
  id: string
  author: string
  content: string
  created_at: string
  author_details?: {
    rating?: number
    avatar_path?: string
  }
}

export interface ShowDetails extends MediaItem {
  genres: Genre[]
  seasons?: Season[]
  number_of_seasons?: number
  number_of_episodes?: number
  status?: string
  tagline?: string
  runtime?: number
  episode_run_time?: number[]
  credits?: { cast: CastMember[] }
  similar?: { results: MediaItem[] }
  videos?: { results: { key: string; site: string; type: string }[] }
  aggregate_credits?: { cast: CastMember[] }
  reviews?: { results: Review[] }
  recommendations?: { results: MediaItem[] }
}

export interface TMDBPage<T> {
  page: number
  results: T[]
  total_pages: number
  total_results: number
}

// ─── Core fetcher ─────────────────────────────────────────────────────────────
// Server Components → hits TMDB directly (no proxy hop needed).
// Client Components → hits /api/tmdb/* proxy (API key stays hidden).

export async function tmdbFetch<T>(
  endpoint: string,
  params: Record<string, string | number | boolean> = {}
): Promise<T> {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))
  )

  const isServer = typeof window === 'undefined'
  let url: string

  if (isServer) {
    qs.set('api_key', process.env.TMDB_API_KEY || '')
    url = `https://api.themoviedb.org/3${endpoint}?${qs}`
  } else {
    url = `/api/tmdb${endpoint}?${qs}`
  }

  // cache server-side requests for 1 hour (3600 seconds) to heavily reduce TMDB API hits.
  const fetchOptions: RequestInit = isServer 
    ? { next: { revalidate: 3600 } } 
    : {}

  const res = await fetch(url, fetchOptions)

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(
      err?.error || err?.status_message || `API error ${res.status}`
    )
  }
  return res.json() as Promise<T>
}

// ─── API helpers ──────────────────────────────────────────────────────────────

export const getTrending = (media: 'movie' | 'tv' | 'all' = 'all', window: 'day' | 'week' = 'week') =>
  tmdbFetch<TMDBPage<MediaItem>>(`/trending/${media}/${window}`, { with_original_language: 'en' })

export const getPopular = (media: 'movie' | 'tv') =>
  tmdbFetch<TMDBPage<MediaItem>>(`/${media}/popular`, { with_original_language: 'en' })

export const getTopRated = (media: 'movie' | 'tv') =>
  tmdbFetch<TMDBPage<MediaItem>>(`/${media}/top_rated`, { with_original_language: 'en' })

export const getNowPlaying = () =>
  tmdbFetch<TMDBPage<MediaItem>>('/movie/now_playing', { with_original_language: 'en' })

export const getOnAir = () =>
  tmdbFetch<TMDBPage<MediaItem>>('/tv/on_the_air', { with_original_language: 'en' })

export const searchMulti = (query: string, page = 1) =>
  tmdbFetch<TMDBPage<MediaItem>>('/search/multi', { query, page, include_adult: false })

export const getMovieDetails = (id: number) =>
  tmdbFetch<ShowDetails>(`/movie/${id}`, { append_to_response: 'credits,similar,videos,reviews,recommendations' })

export const getTVDetails = (id: number) =>
  tmdbFetch<ShowDetails>(`/tv/${id}`, { append_to_response: 'aggregate_credits,similar,videos,reviews,recommendations' })

export const getSeasonDetails = (tvId: number, season: number) =>
  tmdbFetch<{ episodes: Episode[]; videos?: { results: { key: string; site: string; type: string; name: string }[] } }>(`/tv/${tvId}/season/${season}`, { append_to_response: 'videos' })

export const getMovieGenres = () =>
  tmdbFetch<{ genres: Genre[] }>('/genre/movie/list')

export const getTVGenres = () =>
  tmdbFetch<{ genres: Genre[] }>('/genre/tv/list')

export const getCountries = () =>
  tmdbFetch<Country[]>('/configuration/countries')

export interface DiscoverParams {
  media: 'movie' | 'tv'
  sort_by?: string
  with_genres?: string
  with_origin_country?: string
  year?: number
  'vote_average.gte'?: number
  page?: number
  with_original_language?: string
  [key: string]: string | number | boolean | undefined
}

export const discover = ({ media, ...rest }: DiscoverParams) => {
  // Drop the 'en' restriction if the user selects a specific country or language filter
  const hasLanguageOrCountryFilter = rest.with_original_language || rest.with_origin_country;
  const defaultParams = hasLanguageOrCountryFilter ? {} : { with_original_language: 'en' };

  return tmdbFetch<TMDBPage<MediaItem>>(
    `/discover/${media}`,
    { ...defaultParams, ...rest } as Record<string, string | number | boolean>
  )
}

// ─── Image helpers ────────────────────────────────────────────────────────────

export function posterUrl(path: string | null, size: 'w92' | 'w185' | 'w342' | 'w500' | 'original' = 'w342') {
  return path ? `${IMG_BASE}/${size}${path}` : null
}

export function backdropUrl(path: string | null, size: 'w300' | 'w780' | 'w1280' | 'original' = 'w1280') {
  return path ? `${IMG_BASE}/${size}${path}` : null
}

export function mediaTitle(item: MediaItem) { return item.title || item.name || 'Untitled' }
export function mediaYear(item: MediaItem) { return (item.release_date || item.first_air_date || '').slice(0, 4) }
export function mediaType(item: MediaItem): 'movie' | 'tv' {
  if (item.media_type === 'movie') return 'movie'
  if (item.media_type === 'tv') return 'tv'
  return item.first_air_date ? 'tv' : 'movie'
}
