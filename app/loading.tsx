import HeroBanner from '@/components/HeroBanner'
import MediaRow from '@/components/MediaRow'
import styles from './page.module.css'

export default function HomeLoading() {
  return (
    <main>
      <HeroBanner items={[]} loading={true} />
      <div className={`page-container ${styles.sections}`}>
        {['t1', 't2', 't3', 't4'].map(k => (
          <MediaRow key={k} title="Loading…" emoji="⏳" items={[]} loading={true} seeAllHref="#" />
        ))}
      </div>
    </main>
  )
}
