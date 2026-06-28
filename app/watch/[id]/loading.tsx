import styles from './watch-loading.module.css'

export default function WatchLoading() {
  return (
    <main className={styles.main}>
      <div className={`page-container ${styles.container}`}>
        <div className={`skeleton ${styles.backSkeleton}`} />
        <div className={`skeleton ${styles.titleSkeleton}`} />
        <div className={`skeleton ${styles.playerSkeleton}`} />
      </div>
    </main>
  )
}
