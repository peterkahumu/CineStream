export const STREAMING_SERVERS = [
  { id: 'vidlink', name: 'Server 1 (Vidlink)' },
  { id: 'vsembed', name: 'Server 2 (VSEmbed)' }
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

  if (serverId === 'vsembed') {
    if (type === 'movie') return `https://vidsrc-embed.ru/embed/movie?tmdb=${id}`
    return `https://vidsrc-embed.ru/embed/tv?tmdb=${id}&season=${s}&episode=${e}`
  }

  // Default to vidlink
  const domain = process.env.STREAMING_PROVIDER || 'vidlink.pro'
  if (type === 'movie') return `https://${domain}/movie/${id}`
  return `https://${domain}/tv/${id}/${s}/${e}`
}
