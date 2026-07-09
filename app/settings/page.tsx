'use client'

import { useState, useRef, useEffect } from 'react'
import { useSettings } from '@/components/SettingsProvider'
import { type Theme, type Layout, type WishlistSort } from '@/lib/settings'
import CustomSelect from '@/components/CustomSelect'
import Modal from '@/components/Modal'
import styles from './page.module.css'

// Popular streaming providers with their TMDB IDs and emoji/colors
const STREAMING_PROVIDERS = [
  { id: 8,   name: 'Netflix',     emoji: '🔴', color: '#E50914' },
  { id: 9,   name: 'Prime Video', emoji: '🔵', color: '#00A8E1' },
  { id: 337, name: 'Disney+',     emoji: '✨', color: '#113CCF' },
  { id: 384, name: 'Max',         emoji: '💙', color: '#002BE7' },
  { id: 15,  name: 'Hulu',        emoji: '💚', color: '#1CE783' },
  { id: 2,   name: 'Apple TV+',   emoji: '🍎', color: '#555555' },
  { id: 283, name: 'Crunchyroll', emoji: '🍊', color: '#FF6400' },
  { id: 531, name: 'Paramount+',  emoji: '⭐', color: '#0064FF' },
]

const REGIONS = [
  { code: 'US', name: '🇺🇸 United States' },
  { code: 'GB', name: '🇬🇧 United Kingdom' },
  { code: 'CA', name: '🇨🇦 Canada' },
  { code: 'AU', name: '🇦🇺 Australia' },
  { code: 'DE', name: '🇩🇪 Germany' },
  { code: 'FR', name: '🇫🇷 France' },
  { code: 'JP', name: '🇯🇵 Japan' },
  { code: 'KR', name: '🇰🇷 South Korea' },
  { code: 'IN', name: '🇮🇳 India' },
  { code: 'BR', name: '🇧🇷 Brazil' },
  { code: 'MX', name: '🇲🇽 Mexico' },
  { code: 'NG', name: '🇳🇬 Nigeria' },
  { code: 'ZA', name: '🇿🇦 South Africa' },
  { code: 'KE', name: '🇰🇪 Kenya' },
]

const LANGUAGES = [
  { code: 'en-US', name: 'English (US)' },
  { code: 'en-GB', name: 'English (UK)' },
  { code: 'es-ES', name: 'Español (Spain)' },
  { code: 'es-MX', name: 'Español (Mexico)' },
  { code: 'fr-FR', name: 'Français' },
  { code: 'de-DE', name: 'Deutsch' },
  { code: 'ja-JP', name: '日本語' },
  { code: 'ko-KR', name: '한국어' },
  { code: 'pt-BR', name: 'Português (Brasil)' },
  { code: 'hi-IN', name: 'हिन्दी' },
  { code: 'sw-KE', name: 'Kiswahili' },
]

function Toggle({
  checked,
  onChange,
  id,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  id: string
}) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`${styles.toggle} ${checked ? styles.toggleOn : ''}`}
    >
      <span className={styles.toggleThumb} />
    </button>
  )
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className={styles.settingRow}>
      <div className={styles.settingLabel}>
        <span>{label}</span>
        {description && <p>{description}</p>}
      </div>
      <div className={styles.settingControl}>{children}</div>
    </div>
  )
}

export default function SettingsPage() {
  const { settings, updateSetting } = useSettings()
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [mounted, setMounted] = useState(false)
  const importRef = useRef<HTMLInputElement>(null)

  // ── Initialize client state ────────────────────────────────────────────
  useEffect(() => {
    setMounted(true)
    const checkCookie = () => document.cookie.split('; ').find(row => row.startsWith('cinemaphora_terms='))?.split('=')[1] === 'true'
    setTermsAccepted(checkCookie())

    const onTermsChanged = () => {
      setTermsAccepted(checkCookie())
    }
    window.addEventListener('termsAccepted', onTermsChanged)
    return () => window.removeEventListener('termsAccepted', onTermsChanged)
  }, [])

  // ── Terms revoke ───────────────────────────────────────────────────────
  const handleConfirmRevoke = () => {
    document.cookie = 'cinemaphora_terms=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax'
    window.dispatchEvent(new Event('termsAccepted'))
    setShowRevokeConfirm(false)
    window.location.href = '/'
  }

  // ── Wishlist export ────────────────────────────────────────────────────
  const handleExportWishlist = () => {
    const raw = localStorage.getItem('wishlist') || '[]'
    const blob = new Blob([raw], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cinemaphora-wishlist-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Wishlist import ────────────────────────────────────────────────────
  const handleImportWishlist = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string)
        if (!Array.isArray(parsed)) throw new Error('Invalid format')
        localStorage.setItem('wishlist', JSON.stringify(parsed))
        setImportStatus('success')
        window.dispatchEvent(new StorageEvent('storage', { key: 'wishlist' }))
        setTimeout(() => setImportStatus('idle'), 3000)
      } catch {
        setImportStatus('error')
        setTimeout(() => setImportStatus('idle'), 3000)
      }
    }
    reader.readAsText(file)
    // Reset so the same file can be re-imported
    if (importRef.current) importRef.current.value = ''
  }

  // ── Clear search history ───────────────────────────────────────────────
  const handleClearSearchHistory = () => {
    localStorage.removeItem('searchHistory')
    window.dispatchEvent(new StorageEvent('storage', { key: 'searchHistory' }))
  }

  // ── Clear all data ─────────────────────────────────────────────────────
  const handleConfirmClearAll = () => {
    // Clear all cookies
    document.cookie.split(';').forEach(c => {
      const key = c.trim().split('=')[0]
      document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`
    })
    localStorage.clear()
    setShowClearConfirm(false)
    window.location.href = '/'
  }

  // ── Preferred providers toggle ─────────────────────────────────────────
  const toggleProvider = (id: number) => {
    const current = settings.preferredProviders
    const next = current.includes(id)
      ? current.filter(p => p !== id)
      : [...current, id]
    updateSetting('preferredProviders', next)
  }

  // Removed synchronous termsAccepted check to prevent hydration errors

  return (
    <>
      <div className="page-content page-container">
        <div className={styles.container}>
          {/* Page Header */}
          <div className={styles.header}>
            <h1 className={styles.title}>⚙️ Settings</h1>
            <p className={styles.subtitle}>Personalise your CinemaPhora experience</p>
          </div>

          {/* ── Appearance ──────────────────────────────────────────────── */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>🎨 Appearance</h2>

            <SettingRow label="Theme" description="Choose your preferred colour scheme.">
              <div className={styles.themeButtons}>
                {(['light', 'dark', 'system'] as Theme[]).map(t => (
                  <button
                    key={t}
                    onClick={() => updateSetting('theme', t)}
                    className={`${styles.themeBtn} ${settings.theme === t ? styles.themeBtnActive : ''}`}
                  >
                    {t === 'light' ? '☀️' : t === 'dark' ? '🌙' : '💻'}
                    <span>{t.charAt(0).toUpperCase() + t.slice(1)}</span>
                  </button>
                ))}
              </div>
            </SettingRow>

            <SettingRow
              label="Reduce Motion"
              description="Disable animations and transitions. Great for older devices or motion sensitivity."
            >
              <Toggle
                id="reduceMotion"
                checked={settings.reduceMotion}
                onChange={v => updateSetting('reduceMotion', v)}
              />
            </SettingRow>
          </section>

          {/* ── Playback & Data ─────────────────────────────────────────── */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>🎬 Playback & Data</h2>

            <SettingRow
              label="Autoplay Trailers"
              description="Automatically play trailers when you open a movie or TV show page."
            >
              <Toggle
                id="autoplayTrailers"
                checked={settings.autoplayTrailers}
                onChange={v => updateSetting('autoplayTrailers', v)}
              />
            </SettingRow>

            <SettingRow
              label="Data Saver"
              description="Load lower-resolution images and skip auto-fetching trailers to save data on mobile."
            >
              <Toggle
                id="dataSaver"
                checked={settings.dataSaver}
                onChange={v => updateSetting('dataSaver', v)}
              />
            </SettingRow>
          </section>

          {/* ── Content & Discovery ─────────────────────────────────────── */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>🧭 Content & Discovery</h2>

            <SettingRow
              label="Safe Search"
              description="Filter out adult content from search results and discovery feeds."
            >
              <Toggle
                id="safeSearch"
                checked={settings.safeSearch}
                onChange={v => updateSetting('safeSearch', v)}
              />
            </SettingRow>

            <SettingRow label="Region" description="Your TMDB region affects release dates and available streaming providers.">
              <CustomSelect
                value={settings.region}
                options={REGIONS.map(r => ({ value: r.code, label: r.name }))}
                onChange={v => updateSetting('region', v)}
              />
            </SettingRow>

            <SettingRow label="Language" description="Preferred language for titles and descriptions.">
              <CustomSelect
                value={settings.language}
                options={LANGUAGES.map(l => ({ value: l.code, label: l.name }))}
                onChange={v => updateSetting('language', v)}
              />
            </SettingRow>

            <div className={styles.providersBlock}>
              <div className={styles.settingLabel}>
                <span>Preferred Streaming Services</span>
                <p>Highlight content from the services you subscribe to.</p>
              </div>
              <div className={styles.providerGrid}>
                {STREAMING_PROVIDERS.map(p => {
                  const active = settings.preferredProviders.includes(p.id)
                  return (
                    <button
                      key={p.id}
                      onClick={() => toggleProvider(p.id)}
                      className={`${styles.providerChip} ${active ? styles.providerChipActive : ''}`}
                      style={active ? { borderColor: p.color, background: `${p.color}18` } : {}}
                    >
                      <span>{p.emoji}</span>
                      <span>{p.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </section>

          {/* ── Search & Feed ───────────────────────────────────────────── */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>🔍 Search & Feed</h2>

            <SettingRow
              label="Save Search History"
              description="Remember your recent searches to speed up future queries."
            >
              <Toggle
                id="saveSearchHistory"
                checked={settings.saveSearchHistory}
                onChange={v => updateSetting('saveSearchHistory', v)}
              />
            </SettingRow>

            <SettingRow label="Default View Layout" description="Choose how search results and feeds are displayed.">
              <div className={styles.layoutButtons}>
                {(['grid', 'list'] as Layout[]).map(l => (
                  <button
                    key={l}
                    onClick={() => updateSetting('defaultLayout', l)}
                    className={`${styles.layoutBtn} ${settings.defaultLayout === l ? styles.layoutBtnActive : ''}`}
                  >
                    {l === 'grid' ? '⊞ Grid' : '☰ List'}
                  </button>
                ))}
              </div>
            </SettingRow>

            <SettingRow label="Default Wishlist Sort" description="How your saved list is ordered by default.">
              <CustomSelect
                value={settings.defaultSortWishlist}
                options={[
                  { value: 'added', label: 'Recently Added' },
                  { value: 'alpha', label: 'Alphabetical' },
                  { value: 'rating', label: 'Highest Rated' },
                  { value: 'date', label: 'Release Date' },
                ]}
                onChange={v => updateSetting('defaultSortWishlist', v as WishlistSort)}
              />
            </SettingRow>
          </section>

          {/* ── Data Management ─────────────────────────────────────────── */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>💾 Data Management</h2>

            <div className={styles.dataActions}>
              <div className={styles.dataAction}>
                <div>
                  <strong>Export Wishlist</strong>
                  <p>Download your saved movies and TV shows as a JSON file.</p>
                </div>
                <button className={styles.actionBtn} onClick={handleExportWishlist}>
                  ⬇ Export
                </button>
              </div>

              <div className={styles.dataAction}>
                <div>
                  <strong>Import Wishlist</strong>
                  <p>
                    Restore from a previously exported JSON file.{' '}
                    {importStatus === 'success' && <span className={styles.importSuccess}>✓ Imported!</span>}
                    {importStatus === 'error' && <span className={styles.importError}>✗ Invalid file</span>}
                  </p>
                </div>
                <button className={styles.actionBtn} onClick={() => importRef.current?.click()}>
                  ⬆ Import
                </button>
                <input
                  ref={importRef}
                  type="file"
                  accept=".json"
                  className={styles.hiddenInput}
                  onChange={handleImportWishlist}
                />
              </div>

              <div className={styles.dataAction}>
                <div>
                  <strong>Clear Search History</strong>
                  <p>Remove all saved search queries from this device.</p>
                </div>
                <button className={styles.actionBtn} onClick={handleClearSearchHistory}>
                  🗑 Clear
                </button>
              </div>
            </div>
          </section>

          {/* ── Legal & Compliance ──────────────────────────────────────── */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>📜 Legal & Compliance</h2>
            <div className={styles.settingRow}>
              <div className={styles.settingLabel}>
                <span>Terms Agreement Status</span>
                <p>You must agree to the Terms of Use and Privacy Policy to use CinemaPhora.</p>
              </div>
              <div className={styles.settingControl}>
                {!mounted ? (
                  <span className={styles.statusPending}>Loading...</span>
                ) : termsAccepted ? (
                  <span className={styles.statusAccepted}>✓ Agreed</span>
                ) : (
                  <span className={styles.statusPending}>✗ Not Agreed</span>
                )}
              </div>
            </div>
            {termsAccepted && (
              <button className={styles.revokeButton} onClick={() => setShowRevokeConfirm(true)}>
                Revoke Agreement
              </button>
            )}
          </section>

          {/* ── Danger Zone ─────────────────────────────────────────────── */}
          <section className={`${styles.section} ${styles.dangerZone}`}>
            <h2 className={styles.sectionTitle}>⚠️ Danger Zone</h2>
            <div className={styles.dataAction}>
              <div>
                <strong>Clear All Data</strong>
                <p>Wipe your wishlist, search history, settings, and terms agreement from this device. This cannot be undone.</p>
              </div>
              <button className={`${styles.actionBtn} ${styles.dangerBtn}`} onClick={() => setShowClearConfirm(true)}>
                🗑 Clear All
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* ── Revoke Confirmation Modal ─────────────────────────────────── */}
      <Modal
        isOpen={showRevokeConfirm}
        title="Are you sure?"
        description="You cannot use CinemaPhora without agreeing to the Terms of Use and Privacy Policy. If you revoke your agreement, you will be prompted to accept the terms again."
        confirmText="Yes, Revoke Agreement"
        cancelText="Go Back"
        onConfirm={handleConfirmRevoke}
        onCancel={() => setShowRevokeConfirm(false)}
      />

      {/* ── Clear All Confirmation Modal ──────────────────────────────── */}
      <Modal
        isOpen={showClearConfirm}
        title="Clear All Data?"
        description="This will permanently delete your wishlist, search history, all settings, and your terms agreement from this device. You will need to agree to the terms again. This action cannot be undone."
        confirmText="Yes, Clear Everything"
        cancelText="Cancel"
        onConfirm={handleConfirmClearAll}
        onCancel={() => setShowClearConfirm(false)}
      />
    </>
  )
}
