import styles from './page.module.css'

export default function WatchLoading() {
  return (
    <main className={styles.main}>
      <div className={`page-container ${styles.container}`}>
        <div className={styles.header}>
          <div className="skeleton" style={{ width: '150px', height: '20px', marginBottom: '8px' }} />
          <div className="skeleton" style={{ width: '60%', height: '40px' }} />
        </div>

        <div className={styles.layout}>
          <div className={styles.playerWrapper}>
            <div className={styles.playerSection}>
              <div className="skeleton" style={{ width: '100%', height: '100%' }} />
            </div>
            <div className="skeleton" style={{ width: '100%', height: '56px', borderRadius: '12px' }} />
          </div>
          
          <aside className={styles.sidebar}>
            <div className="skeleton" style={{ width: '100%', height: '600px', borderRadius: '16px' }} />
          </aside>
        </div>
      </div>
    </main>
  )
}
