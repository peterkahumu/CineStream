export interface StreamingServer {
  id: string
  name: string
  url: string
}

export function getStreamingServers(): StreamingServer[] {
  const servers: StreamingServer[] = []

  const moviesApi = process.env.MOVIESAPI_URL || process.env.NEXT_PUBLIC_MOVIESAPI_URL
  if (moviesApi) {
    servers.push({ id: 'moviesapi', name: 'Server 1 (MoviesAPI)', url: moviesApi })
  }

  const primeSrc = process.env.PRIMESRC_URL || process.env.NEXT_PUBLIC_PRIMESRC_URL
  if (primeSrc) {
    servers.push({ id: 'primesrc', name: 'Server 2 (PrimeSrc)', url: primeSrc })
  }

  const vidlink = process.env.VIDLINK_URL || process.env.NEXT_PUBLIC_VIDLINK_URL
  if (vidlink) {
    servers.push({ id: 'vidlink', name: 'Server 3 (Vidlink)', url: vidlink })
  }

  const multiembed = process.env.MULTIEMBED_URL || process.env.NEXT_PUBLIC_MULTIEMBED_URL
  if (multiembed) {
    servers.push({ id: 'multiembed', name: 'Server 4 (Multiembed)', url: multiembed })
  }

  return servers
}

export function buildEmbedUrl(
  serverUrl: string,
  serverId: string,
  type: 'movie' | 'tv',
  id: number | string,
  season?: number,
  episode?: number
): string {
  const s = season ?? 1
  const e = episode ?? 1
  const base = serverUrl

  if (serverId === 'primesrc') {
    if (type === 'movie') return `${base}/embed/movie?tmdb=${id}`
    return `${base}/embed/tv?tmdb=${id}&season=${s}&episode=${e}`
  }

  if (serverId === 'vidlink') {
    if (type === 'movie') return `${base}/movie/${id}`
    return `${base}/tv/${id}/${s}/${e}`
  }

  if (serverId === 'multiembed') {
    if (type === 'movie') return `${base}/?video_id=${id}&tmdb=1`
    return `${base}/?video_id=${id}&tmdb=1&s=${s}&e=${e}`
  }

  // moviesapi
  if (type === 'movie') return `${base}/movie/${id}`
  return `${base}/tv/${id}/${s}/${e}`
}
