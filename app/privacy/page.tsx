import type { Metadata } from 'next'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy for CinemaPhora.',
}

export default function PrivacyPage() {
  return (
    <div className="page-content page-container">
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>🛡️ Privacy Policy</h1>
          <p className={styles.subtitle}>How we handle and protect your information</p>
        </div>
        <div className={styles.content}>
        <h2>1. Information We Collect</h2>
        <p>
          CinemaPhora is designed to respect your privacy. We do not require user registration to use the core features of the site. 
          We do not collect, store, or process personal identifiable information (PII) on our servers.
        </p>

        <h2>2. Local Storage</h2>
        <p>
          We use your browser&apos;s local storage (and/or Capacitor local storage on mobile apps) to save certain preferences and states to enhance your experience:
        </p>
        <ul>
          <li><strong>Terms Agreement:</strong> We store a flag indicating that you have agreed to our Terms of Use so you are not repeatedly prompted.</li>
          <li><strong>Watch History/Progress:</strong> We may store your video watch progress locally on your device to enable the &quot;Continue Watching&quot; feature. This data never leaves your device.</li>
        </ul>
        <p>
          You can clear this data at any time by clearing your browser cache and local storage, or via the app&apos;s settings.
        </p>

        <h2>3. Third-Party Services</h2>
        <p>
          Our site integrates with third-party APIs and services, such as TMDB (The Movie Database) for metadata and external video providers for streaming. 
          When you interact with these third-party streams, your IP address and user-agent may be exposed to them. We encourage you to read the privacy policies of any third-party services you use.
        </p>

        <h2>4. Analytics</h2>
        <p>
          We may use basic, privacy-focused analytics to understand how our site is used (e.g., page views). We do not use analytics tools that track individual users across the web or collect personal information.
        </p>

        <h2>5. Changes to This Policy</h2>
        <p>
          We may update our Privacy Policy from time to time. Any changes will be posted on this page. Your continued use of the service after any modifications indicates your acceptance of the updated Privacy Policy.
        </p>
      </div>
      </div>
    </div>
  )
}
