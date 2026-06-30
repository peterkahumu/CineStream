'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

interface Props {
  id: string
  className: string
}

export default function WatchTvButton({ id, className }: Props) {
  const searchParams = useSearchParams()
  const currentTab = searchParams.get('tab')

  const handleScroll = (e: React.MouseEvent) => {
    // If we are already on the watch tab, Next.js might ignore the navigation 
    // since the URL isn't changing. We manually scroll down to ensure the 
    // user always gets taken to the episodes section even if they clicked it again.
    if (!currentTab || currentTab === 'watch') {
      e.preventDefault()
      document.getElementById('media-tabs')?.scrollIntoView({ behavior: 'smooth' })
      // Optionally update the URL hash without triggering a navigation
      window.history.pushState(null, '', `#media-tabs`)
    }
  }

  return (
    <Link
      href={`/details/${id}?type=tv&tab=watch&s=1#media-tabs`}
      className={className}
      onClick={handleScroll}
      replace={true}
      scroll={true}
    >
      ▶ Choose Episode
    </Link>
  )
}
