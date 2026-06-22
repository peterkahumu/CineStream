import LoadingSpinner from '@/components/LoadingSpinner'
import styles from './page.module.css'

export default function SearchLoading() {
  return (
    <main className="page-content">
      <div className="page-container">
        {/* Fake search form to prevent layout shift */}
        <div className={styles.form}>
          <div className={styles.inputWrap}>
            <span className={styles.searchIcon}>🔍</span>
            <input className={styles.input} disabled placeholder="Search movies & TV shows…" />
          </div>
          <button disabled className="btn btn-primary" style={{ flexShrink: 0 }}>
            Search
          </button>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem' }}>
          <LoadingSpinner size="lg" text="Searching…" />
        </div>
      </div>
    </main>
  )
}
