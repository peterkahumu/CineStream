'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'
import modalStyles from '@/components/TermsAgreementModal.module.css'

export default function SettingsPage() {
  const router = useRouter()
  const [termsAccepted, setTermsAccepted] = useState<boolean | null>(null)
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false)

  useEffect(() => {
    const updateState = () => {
      const accepted = localStorage.getItem('termsAccepted') === 'true'
      setTermsAccepted(accepted)
    }
    
    updateState()
    
    window.addEventListener('termsAccepted', updateState)
    return () => window.removeEventListener('termsAccepted', updateState)
  }, [])

  const handleRevoke = () => {
    setShowRevokeConfirm(true)
  }

  const handleConfirmRevoke = () => {
    localStorage.removeItem('termsAccepted')
    setTermsAccepted(false)
    window.dispatchEvent(new Event('termsAccepted'))
    setShowRevokeConfirm(false)
    window.location.href = '/'
  }

  return (
    <>
      <div className="page-content page-container">
        <div className={styles.container}>
          <div className={styles.header}>
            <h1 className={styles.title}>⚙️ Settings</h1>
            <p className={styles.subtitle}>Manage your preferences and agreements</p>
          </div>
          
          <div className={styles.section}>
            <h2>Legal & Compliance</h2>
            <p>
              Status:{' '}
              {termsAccepted === null ? (
                'Loading...'
              ) : termsAccepted ? (
                <span className={styles.statusAccepted}>Agreed</span>
              ) : (
                <span className={styles.statusPending}>Not Agreed</span>
              )}
            </p>
            <p>
              You must agree to the Terms of Use and Privacy Policy to use CinemaPhora. 
              If you revoke your agreement, you will be prompted to agree again on your next visit.
            </p>
            {termsAccepted && (
              <button className={styles.revokeButton} onClick={handleRevoke}>
                Revoke Agreement
              </button>
            )}
          </div>

          <div className={styles.section}>
            <h2>Preferences</h2>
            <p>Future settings (e.g., UI theme, notifications, watch history management) will appear here.</p>
          </div>
        </div>
      </div>

      {showRevokeConfirm && (
        <div className={modalStyles.overlay}>
          <div className={modalStyles.modal}>
            <h2 className={modalStyles.title}>Are you sure?</h2>
            <p className={modalStyles.message}>
              You cannot use CinemaPhora without agreeing to the Terms of Use and Privacy Policy.
              If you revoke your agreement, you will be prompted to accept the terms again.
            </p>
            <div className={modalStyles.buttonContainer}>
              <button className={modalStyles.acceptButton} onClick={() => setShowRevokeConfirm(false)}>
                Go Back
              </button>
              <button className={`${modalStyles.declineButton} ${modalStyles.dangerButton}`} onClick={handleConfirmRevoke}>
                Yes, Revoke Agreement
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
