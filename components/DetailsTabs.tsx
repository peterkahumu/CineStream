'use client'

import Link from 'next/link'
import styles from './DetailsTabs.module.css'

interface Props {
  activeTab: 'watch' | 'trailers' | 'details'
  mediaType: 'movie' | 'tv'
  id: string
  children: React.ReactNode
}

export default function DetailsTabs({ activeTab, mediaType, id, children }: Props) {
  const tabs = [
    ...(mediaType === 'tv' ? [{ id: 'watch', label: 'Watch' }] : []),
    { id: 'trailers', label: 'Trailers' },
    { id: 'details', label: 'More Details' }
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
