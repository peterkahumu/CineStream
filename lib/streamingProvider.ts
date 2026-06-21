const STREAMING_PROVIDER = process.env.STREAMING_PROVIDER

export function buildEmbedUrl(
  type: 'movie' | 'tv',
  id: number | string,
  season?: number,
  episode?: number
): string {
  if (type === 'movie') {
    console.log("Streaming Provider: ", STREAMING_PROVIDER)
    return `https://${STREAMING_PROVIDER}/movie/${id}`
  }
  const s = season ?? 1
  const e = episode ?? 1
  console.log("Streaming Provider: ", STREAMING_PROVIDER)
  return `https://${STREAMING_PROVIDER}/tv/${id}/${s}/${e}`
}
