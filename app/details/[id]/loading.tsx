import styles from './page.module.css'

export default function DetailsLoading() {
  return (
    <main className={styles.main}>
      <div className={styles.hero}>
        <div className="skeleton" style={{ width: '100%', height: '100%' }} />
        <div className={styles.gradientBottom} />
        <div className={styles.gradientLeft} />

        <div className={`page-container ${styles.heroContent}`}>
          <div className="skeleton" style={{ width: '120px', height: '24px', marginBottom: '24px' }} />
          <div className="skeleton" style={{ width: '200px', height: '24px', marginBottom: '24px' }} />
          <div className="skeleton" style={{ width: '50%', height: '64px', marginBottom: '24px' }} />
          <div className="skeleton" style={{ width: '80%', height: '80px', marginBottom: '24px' }} />
          <div className="skeleton" style={{ width: '150px', height: '48px', borderRadius: '24px' }} />
        </div>
      </div>

      <div className={`page-container ${styles.contentWrapper}`}>
        <section className={styles.section}>
          <div className="skeleton" style={{ width: '150px', height: '32px', marginBottom: '16px' }} />
          <div style={{ display: 'flex', gap: '16px', overflow: 'hidden' }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ width: '150px', height: '225px', borderRadius: '12px', flexShrink: 0 }} />
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
