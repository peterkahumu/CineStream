import { cookies } from 'next/headers'

interface Props {
  trailerKey: string
  name: string
  className?: string
}

/**
 * Server component — reads the autoplayTrailers cookie server-side
 * so the YouTube embed src is rendered with the correct ?autoplay= param
 * without any client-side JS or hydration mismatch.
 */
export default async function TrailerIframe({ trailerKey, name, className }: Props) {
  const cookieStore = await cookies()
  const raw = cookieStore.get('cp_autoplayTrailers')?.value
  const autoplay = raw === 'true' ? 1 : 0

  const src = `https://www.youtube.com/embed/${trailerKey}?autoplay=${autoplay}&mute=${autoplay}&rel=0`

  return (
    <iframe
      className={className}
      src={src}
      title={name}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
    />
  )
}
