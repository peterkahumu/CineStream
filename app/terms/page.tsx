import type { Metadata } from 'next'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Terms of Use',
  description: 'Terms of Use and Conditions for CinemaPhora.',
}

export default function TermsPage() {
  return (
    <div className="page-content page-container">
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>📜 Terms of Use</h1>
          <p className={styles.subtitle}>Our rules and guidelines for using CinemaPhora</p>
        </div>
        <div className={styles.content}>
        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing and using CinemaPhora, you accept and agree to be bound by the terms and provision of this agreement. 
          If you do not agree to abide by these terms, please do not use this service.
        </p>

        <h2>2. Nature of the Service</h2>
        <p>
          CinemaPhora is an indexing and aggregating service. It functions as a specialized search engine for media content.
        </p>
        <ul>
          <li><strong>No Hosting:</strong> CinemaPhora does not host, upload, or manage any of the video content accessible through its platform.</li>
          <li><strong>Third-Party Links:</strong> All media streams are provided by independent third-party servers. We merely provide a convenient interface to find and embed these third-party streams.</li>
          <li><strong>No Control:</strong> We have no control over the content, availability, or legality of the third-party streams.</li>
        </ul>

        <h2>3. Copyright Infringement</h2>
        <p>
          Since we do not host any media files, we cannot remove content from the servers hosting them. 
          If you believe that your copyrighted work is being infringed upon, you must direct your DMCA takedown requests to the respective third-party video hosting providers. 
          Removing a link from CinemaPhora does not remove the content from the internet.
        </p>

        <h2>4. User Conduct</h2>
        <p>
          Users agree to use the service only for lawful purposes. You agree not to take any action that might compromise the security of the site, render the site inaccessible to others, or otherwise cause damage to the site or its content.
        </p>

        <h2>5. Disclaimer of Warranties</h2>
        <p>
          Your use of the service is at your sole risk. The service is provided on an "AS IS" and "AS AVAILABLE" basis. 
          CinemaPhora makes no warranty that the service will meet your requirements or be uninterrupted, timely, secure, or error-free.
        </p>

        <h2>6. Changes to Terms</h2>
        <p>
          We reserve the right to modify these terms at any time. Your continued use of the service following any changes indicates your acceptance of the new terms.
        </p>
      </div>
      </div>
    </div>
  )
}
