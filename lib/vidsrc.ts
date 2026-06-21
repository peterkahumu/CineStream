export function buildEmbedUrl(
  type: 'movie' | 'tv',
  id: number | string,
  season?: number,
  episode?: number
): string {
  if (type === 'movie') {
    return `https://vidlink.pro/movie/${id}`
  }
  const s = season ?? 1
  const e = episode ?? 1
  return `https://vidlink.pro/tv/${id}/${s}/${e}`
}
