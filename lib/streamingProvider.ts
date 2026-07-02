export interface StreamingServer {
  id: string
  name: string
  url: string
}

export function getStreamingServers(): StreamingServer[] {
  const servers: StreamingServer[] = []

  const cinesrc = process.env.CINESRC_URL || process.env.NEXT_PUBLIC_CINESRC_URL
  if (cinesrc) {
    servers.push({ id: 'cinesrc', name: 'CineSRC', url: cinesrc })
  }

  const embedmaster = process.env.EMBEDMASTER_URL || process.env.NEXT_PUBLIC_EMBEDMASTER_URL
  if (embedmaster) {
    servers.push({ id: 'embedmaster', name: 'Embedmaster', url: embedmaster })
  }

  const vidnest = process.env.VIDNEST_URL || process.env.NEXT_PUBLIC_VIDNEST_URL
  if (vidnest) {
    servers.push({ id: 'vidnest', name: 'Vidnest', url: vidnest })
  }

  const moviesApi = process.env.MOVIESAPI_URL || process.env.NEXT_PUBLIC_MOVIESAPI_URL
  if (moviesApi) {
    servers.push({ id: 'moviesapi', name: 'MoviesAPI', url: moviesApi })
  }

  const primeSrc = process.env.PRIMESRC_URL || process.env.NEXT_PUBLIC_PRIMESRC_URL
  if (primeSrc) {
    servers.push({ id: 'primesrc', name: 'PrimeSrc', url: primeSrc })
  }

  const vidlink = process.env.VIDLINK_URL || process.env.NEXT_PUBLIC_VIDLINK_URL
  if (vidlink) {
    servers.push({ id: 'vidlink', name: 'Vidlink', url: vidlink })
  }

  const multiembed = process.env.MULTIEMBED_URL || process.env.NEXT_PUBLIC_MULTIEMBED_URL
  if (multiembed) {
    servers.push({ id: 'multiembed', name: 'Multiembed', url: multiembed })
  }

  const vidfast = process.env.VIDFAST_URL || process.env.NEXT_PUBLIC_VIDFAST_URL
  if (vidfast) {
    servers.push({ id: 'vidfast', name: 'Vidfast', url: vidfast })
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

  if (serverId === 'moviesapi') {
    if (type === 'movie') return `${base}/movie/${id}`
    return `${base}/tv/${id}/${s}/${e}`
  }

  if (serverId === 'vidfast') {
    if (type === 'movie') return `${base}/movie/${id}?autoPlay=true&title=true&poster=true&theme=16A085`
    return `${base}/tv/${id}/${s}/${e}?autoPlay=true&title=true&poster=true&theme=16A085&nextButton=true&autoNext=true`
  }

  if (serverId === 'embedmaster') {
    if (type === 'movie') return `${base}/movie/${id}`
    return `${base}/tv/${id}/${s}/${e}`
  }

  if (serverId === 'vidnest') {
    if (type === 'movie') return `${base}/movie/${id}`
    return `${base}/tv/${id}/${s}/${e}`
  }

  // default to cinesrc
  if (type == "movie") return `${base}/embed/movie/${id}`
  return `${base}/embed/tv/${id}?s=${s}&e=${e}`
}
