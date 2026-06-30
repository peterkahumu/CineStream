'use client'

import Link from 'next/link'
import styles from './DetailsTabs.module.css'

interface Props {
  activeTab: 'watch' | 'trailers' | 'cast' | 'reviews'
  mediaType: 'movie' | 'tv'
  id: string
  isUpcoming?: boolean
  children: React.ReactNode
}

export default function DetailsTabs({ activeTab, mediaType, id, isUpcoming, children }: Props) {
  const tabs = [
    // Hide Watch tab for upcoming TV shows — there are no episodes to stream yet
    ...(mediaType === 'tv' && !isUpcoming ? [{ id: 'watch', label: 'Watch' }] : []),
    { id: 'trailers', label: 'Trailers' },
    { id: 'cast', label: 'Cast' },
    { id: 'reviews', label: 'Reviews' }
  ]

  return (
    <div className={styles.tabsContainer}>
      <div className={styles.tabList} role="tablist">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id
          return (
            <Link
              key={tab.id}
              href={`/details/${id}?type=${mediaType}&tab=${tab.id}`}
              replace={true}
              scroll={false}
              className={`${styles.tabBtn} ${isActive ? styles.tabBtnActive : ''}`}
              role="tab"
              aria-selected={isActive}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>
      <div className={styles.tabContent} role="tabpanel">
        {children}
      </div>
    </div>
  )
}
