'use client'
import { useState } from 'react'
import { useApiKey } from '@/hooks/useApiKey'
import styles from './ApiKeyModal.module.css'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function ApiKeyModal({ isOpen, onClose }: Props) {
  const { apiKey, setApiKey } = useApiKey()
  const [input, setInput] = useState(apiKey)
  const [saved, setSaved] = useState(false)

  if (!isOpen) return null

  const handleSave = () => {
    setApiKey(input.trim())
    setSaved(true)
    setTimeout(() => { setSaved(false); onClose() }, 1200)
  }

  const handleClear = () => {
    setApiKey('')
    setInput('')
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={`${styles.modal} glass animate-fadeInScale`} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>⚙️ Settings</h2>
          <button className={styles.close} onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className={styles.body}>
          <div className={styles.field}>
            <label className={styles.label}>
              TMDB API Key
              <a
                href="https://www.themoviedb.org/settings/api"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.link}
              >
                Get free key →
              </a>
            </label>
            <p className={styles.hint}>
              Required for search, discovery and metadata. Your key stays in your browser only.
            </p>
            <div className={styles.inputRow}>
              <input
                type="password"
                className={styles.input}
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Enter your TMDB API key…"
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                autoComplete="off"
              />
              {input && (
                <button className={styles.clearBtn} onClick={handleClear} aria-label="Clear">✕</button>
              )}
            </div>
          </div>

          {apiKey && (
            <div className={styles.status}>
              <span className={styles.statusDot} />
              API key is set
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className={`btn btn-primary ${saved ? styles.savedBtn : ''}`}
            onClick={handleSave}
            disabled={!input.trim()}
          >
            {saved ? '✅ Saved!' : 'Save Key'}
          </button>
        </div>
      </div>
    </div>
  )
}
