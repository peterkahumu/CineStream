'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useSettings } from '@/components/SettingsProvider'
import { type Theme, type Layout, type WishlistSort } from '@/lib/settings'
import { getTermsAccepted, setTermsAccepted, TERMS_EVENT } from '@/lib/terms'
import CustomSelect from '@/components/CustomSelect'
import Modal from '@/components/Modal'
import { useCountries } from '@/lib/useCountries'
import styles from './page.module.css'

/** Must stay in sync with ActionButtons.tsx and WishlistClient.tsx */
const WISHLIST_KEY = 'cinemaphora-wishlist'

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

export default function SettingsClient() {
  const { settings, updateSetting } = useSettings()
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [termsAccepted, setTermsState] = useState(false)
  const [mounted, setMounted] = useState(false)
  
  const { regions, languages, loading } = useCountries()
  
  const importRef = useRef<HTMLInputElement>(null)
  const importTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const sync = useCallback(() => setTermsState(getTermsAccepted()), [])

  // ── Initialize client state ────────────────────────────────────────────
  useEffect(() => {
    setMounted(true)
    sync()
    window.addEventListener(TERMS_EVENT, sync)
    return () => window.removeEventListener(TERMS_EVENT, sync)
  }, [sync])

  // ── Terms revoke ───────────────────────────────────────────────────────
  const handleConfirmRevoke = () => {
    setTermsAccepted(false)
    setShowRevokeConfirm(false)
  }

  // ── Wishlist export ────────────────────────────────────────────────────
  const handleExportWishlist = () => {
    const raw = localStorage.getItem(WISHLIST_KEY) || '[]'
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
        localStorage.setItem(WISHLIST_KEY, JSON.stringify(parsed))
        setImportStatus('success')
        window.dispatchEvent(new StorageEvent('storage', { key: WISHLIST_KEY }))
        if (importTimerRef.current) clearTimeout(importTimerRef.current)
        importTimerRef.current = setTimeout(() => setImportStatus('idle'), 3000)
      } catch {
        setImportStatus('error')
        if (importTimerRef.current) clearTimeout(importTimerRef.current)
        importTimerRef.current = setTimeout(() => setImportStatus('idle'), 3000)
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
    // Revoke terms first (fires TERMS_EVENT → TermsAgreementModal will show)
    setTermsAccepted(false)
    // Clear all other cookies
    document.cookie.split(';').forEach(c => {
      const key = c.trim().split('=')[0]
      if (key !== 'cinemaphora_terms') {
        document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`
      }
    })
    localStorage.clear()
    setShowClearConfirm(false)
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
                {(['light', 'dark', 'system', 'cinema', 'amoled', 'dim'] as Theme[]).map(t => (
                  <button
                    key={t}
                    onClick={() => updateSetting('theme', t)}
                    className={`${styles.themeBtn} ${settings.theme === t ? styles.themeBtnActive : ''}`}
                  >
                    {t === 'light' ? '☀️' : 
                     t === 'dark' ? '🌙' : 
                     t === 'system' ? '💻' : 
                     t === 'cinema' ? '🍿' : 
                     t === 'amoled' ? '⬛' : '🌑'}
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
            
            <SettingRow label="Age Rating Ceiling" description="Filter content above this certification.">
              <CustomSelect
                value={settings.maxCertification}
                options={[
                  { value: 'none', label: 'No Limit' },
                  { value: 'G', label: 'G (General Audiences)' },
                  { value: 'PG', label: 'PG (Parental Guidance)' },
                  { value: 'PG-13', label: 'PG-13 (Parents Strongly Cautioned)' },
                  { value: 'R', label: 'R (Restricted)' },
                  { value: 'NC-17', label: 'NC-17 (Adults Only)' }
                ]}
                onChange={v => updateSetting('maxCertification', v as any)}
              />
            </SettingRow>

            <SettingRow label="Region" description="Your TMDB region affects release dates and available streaming providers.">
              <CustomSelect
                value={settings.region}
                options={loading ? [{ value: settings.region, label: 'Loading...' }] : regions.map(r => ({ value: r.code, label: r.name }))}
                onChange={v => updateSetting('region', v)}
              />
            </SettingRow>

            <SettingRow label="Language" description="Preferred language for titles and descriptions.">
              <CustomSelect
                value={settings.language}
                options={loading ? [{ value: settings.language, label: 'Loading...' }] : languages.map(l => ({ value: l.code, label: l.name }))}
                onChange={v => updateSetting('language', v)}
              />
            </SettingRow>

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
