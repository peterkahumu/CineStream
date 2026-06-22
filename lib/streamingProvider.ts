const servers = []

if (process.env.NEXT_PUBLIC_VIDLINK_URL) {
  servers.push({ id: 'vidlink', name: 'Server 1 (Vidlink)' })
}
if (process.env.NEXT_PUBLIC_MULTIEMBED_URL) {
  servers.push({ id: 'multiembed', name: 'Server 2 (Multiembed)' })
}
if (process.env.NEXT_PUBLIC_VSEMBED_URL) {
  servers.push({ id: 'vsembed', name: 'Server 3 (VSEmbed)' })
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
    const base = process.env.NEXT_PUBLIC_MULTIEMBED_URL
    if (type === 'movie') return `${base}?video_id=${id}&tmdb=1`
    return `${base}?video_id=${id}&tmdb=1&s=${s}&e=${e}`
  }

  if (serverId === 'vsembed') {
    const base = process.env.NEXT_PUBLIC_VSEMBED_URL
    if (type === 'movie') return `${base}/movie?tmdb=${id}`
    return `${base}/tv?tmdb=${id}&season=${s}&episode=${e}`
  }

  // Default to vidlink
  const base = process.env.NEXT_PUBLIC_VIDLINK_URL
  if (type === 'movie') return `${base}/movie/${id}`
  return `${base}/tv/${id}/${s}/${e}`
}
