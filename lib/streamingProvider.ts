export const STREAMING_SERVERS = [
  { id: 'vidlink', name: 'Server 1 (Vidlink)' },
  { id: 'multiembed', name: 'Server 2 (Multiembed)' },
  { id: 'vsembed', name: 'Server 3 (VSEmbed)' }
]

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
    if (type === 'movie') return `https://multiembed.mov/?video_id=${id}&tmdb=1`
    return `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${s}&e=${e}`
  }

  if (serverId === 'vsembed') {
    if (type === 'movie') return `https://vidsrc-embed.ru/embed/movie?tmdb=${id}`
    return `https://vidsrc-embed.ru/embed/tv?tmdb=${id}&season=${s}&episode=${e}`
  }

  // Default to vidlink
  if (type === 'movie') return `https://vidlink.pro/movie/${id}`
  return `https://vidlink.pro/tv/${id}/${s}/${e}`
}
