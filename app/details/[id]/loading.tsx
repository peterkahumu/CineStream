import styles from './loading.module.css'

export default function DetailsLoading() {
  return (
    <main className={styles.main}>
      {/* ── HERO SKELETON ──────────────────────────────────────────────────── */}
      <div className={styles.hero}>
        <div className={styles.gradientBottom} />
        <div className={styles.gradientLeft} />

        <div className={`page-container ${styles.heroContent}`}>
          <div className={`skeleton ${styles.breadcrumbSkeleton}`} />
          
          <div className={styles.metaRow}>
            <div className={`skeleton ${styles.metaChipSkeleton}`} />
            <div className={`skeleton ${styles.metaChipSkeleton}`} />
            <div className={`skeleton ${styles.metaChipSkeleton}`} />
          </div>

          <div className={`skeleton ${styles.titleSkeleton}`} />
          <div className={`skeleton ${styles.taglineSkeleton}`} />
          
          <div className={styles.overviewHero}>
            <div className={`skeleton ${styles.textLine}`} />
            <div className={`skeleton ${styles.textLine}`} />
            <div className={`skeleton ${styles.textLineShort}`} />
          </div>

          <div className={styles.genres}>
            <div className={`skeleton ${styles.genreTagSkeleton}`} />
            <div className={`skeleton ${styles.genreTagSkeleton}`} />
            <div className={`skeleton ${styles.genreTagSkeleton}`} />
          </div>
          
          <div className={styles.actionsRow}>
            <div className={`skeleton ${styles.watchBtnSkeleton}`} />
          </div>
        </div>
      </div>

      {/* ── CONTENT SKELETON ───────────────────────────────────────────────── */}
      <div className={`page-container ${styles.content}`}>
        <section className={styles.section}>
          <div className={`skeleton ${styles.sectionHSkeleton}`} />
          <div className={styles.castGrid}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={styles.castCard}>
                <div className={`skeleton ${styles.castAvatarSkeleton}`} />
                <div className={`skeleton ${styles.castNameSkeleton}`} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
