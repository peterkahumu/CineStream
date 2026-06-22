import LoadingSpinner from '@/components/LoadingSpinner'
import styles from './page.module.css'

export default function WatchLoading() {
  return (
    <main>
      <div className={`page-container ${styles.main}`}>
        <div className={styles.playerSection} style={{ aspectRatio: '16/9', background: '#111', borderRadius: 'var(--radius-lg)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <LoadingSpinner size="lg" text="Loading media details…" />
        </div>
      </div>
    </main>
  )
}
