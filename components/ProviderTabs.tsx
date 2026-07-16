'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import styles from './ProviderTabs.module.css'

const PROVIDERS = [
  {
    id: 8,
    name: 'Netflix',
    gradient: 'linear-gradient(135deg, #e50914 0%, #7a0a0a 100%)',
    emoji: '🔴',
  },
  {
    id: 9,
    name: 'Prime Video',
    gradient: 'linear-gradient(135deg, #00a8e1 0%, #0050a0 100%)',
    emoji: '🔵',
  },
  {
    id: 337,
    name: 'Disney+',
    gradient: 'linear-gradient(135deg, #1a4ef5 0%, #0a1e6e 100%)',
    emoji: '✨',
  },
  {
    id: 350,
    name: 'Apple TV+',
    gradient: 'linear-gradient(135deg, #000000 0%, #444444 100%)',
    emoji: '🍎',
  },
  {
    id: 15,
    name: 'Hulu',
    gradient: 'linear-gradient(135deg, #1ce783 0%, #0c7b44 100%)',
    emoji: '🟢',
  },
  {
    id: 386,
    name: 'Peacock',
    gradient: 'linear-gradient(135deg, #000000 0%, #555555 100%)',
    emoji: '🦚',
  },
]

export default function ProviderTabs() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentProviderId = Number(searchParams.get('with_watch_providers')) || 8

  function switchProvider(id: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('with_watch_providers', id.toString())
    router.push(`?${params.toString()}`, { scroll: false })
  }

  return (
    <div className={styles.tabs}>
      {PROVIDERS.map(p => {
        const isActive = currentProviderId === p.id
        return (
          <button
            key={p.id}
            className={`${styles.tab} ${isActive ? styles.tabActive : ''}`}
            style={isActive ? { background: p.gradient } : {}}
            onClick={() => switchProvider(p.id)}
          >
            <span className={styles.emoji}>{p.emoji}</span>
            <span>{p.name}</span>
          </button>
        )
      })}
    </div>
  )
}
