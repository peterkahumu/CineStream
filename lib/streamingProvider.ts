const servers = []

if (process.env.NEXT_PUBLIC_AUTOEMBED_URL) {
  servers.push({ id: 'autoembed', name: 'Server 1 (AutoEmbed)' })
}

if (process.env.NEXT_PUBLIC_MOVIESAPI_URL) {
  servers.push({ id: 'moviesapi', name: 'Server 2 (MoviesAPI)' })
}

if (process.env.NEXT_PUBLIC_PRIMESRC_URL) {
  servers.push({ id: 'primesrc', name: 'Server 3 (PrimeSrc)' })
}

if (process.env.NEXT_PUBLIC_VIDLINK_URL) {
  servers.push({ id: 'vidlink', name: 'Server 4 (Vidlink)' })
}


if (process.env.NEXT_PUBLIC_MULTIEMBED_URL) {
  servers.push({ id: 'multiembed', name: 'Server 5 (Multiembed)' })
}


export const STREAMING_SERVERS = servers

export function buildEmbedUrl(
  serverId: string,
  type: 'movie' | 'tv',
  id: number | string,
  season?: number,
  episode?: number
): string {
  const s = season ?? 1
  const e = episode ?? 1

  if (serverId === 'multiembed') {
    // base?video_id=123123&tmdb=1
    // base?video_id=123123&tmdb=1&s=1&e=1
    const base = process.env.NEXT_PUBLIC_MULTIEMBED_URL
    if (type === 'movie') return `${base}/?video_id=${id}&tmdb=1`
    return `${base}/?video_id=${id}&tmdb=1&s=${s}&e=${e}`
  }

  if (serverId === 'moviesapi') {
    // base/tv/$id/$season/$episode
    // base/movie/$id
    const base = process.env.NEXT_PUBLIC_MOVIESAPI_URL
    if (type === 'movie') return `${base}/movie/${id}`
    return `${base}/tv/${id}/${s}/${e}`
  }

  if (serverId === 'primesrc') {
    // base/embed/movie?tmdb=tt011035
    // base/embed/tv?tmdb=32726&season=1&episode=1
    const base = process.env.NEXT_PUBLIC_PRIMESRC_URL
    if (type === 'movie') return `${base}/embed/movie?tmdb=${id}`
    return `${base}/embed/tv?tmdb=${id}&season=${s}&episode=${e}`
  }

  if (serverId === 'vidlink') {
    const base = process.env.NEXT_PUBLIC_VIDLINK_URL
    if (type === 'movie') return `${base}/movie/${id}`
    return `${base}/tv/${id}/${s}/${e}`
  }

  // Default to autoembed.
  // base/movie/tmdb/123123
  // base/tv/tmdb/123123-1-1
  const base = process.env.NEXT_PUBLIC_AUTOEMBED_URL
  if (!base) return ''
  if (type === 'movie') return `${base}/movie/tmdb/${id}`
  return `${base}/tv/tmdb/${id}-${s}-${e}`
}
