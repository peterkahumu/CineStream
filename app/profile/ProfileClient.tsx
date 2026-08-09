'use client'

import { useState, useRef, useCallback, useEffect, type ReactNode } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { updateDisplayName } from '@/app/actions/auth'
import ProfileStats from '@/components/ProfileStats'
import WatchHistoryList from '@/components/WatchHistoryList'
import AccountSettings from '@/components/AccountSettings'
import styles from './Profile.module.css'

export type ProfileTab = 'stats' | 'history' | 'account'

interface Props {
  name: string | null
  email: string
  memberSince: string | null
  /** Server-rendered Sign Out form, injected as a slot (see page.tsx). */
  children?: ReactNode
}

function initialsFor(name: string | null, email: string): string {
  const source = name?.trim() || email
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return source.slice(0, 2).toUpperCase()
}

function formatMemberSince(iso: string | null): string | null {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export default function ProfileClient({ name, email, memberSince, children }: Props) {
  const [displayName, setDisplayName] = useState(name)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(name ?? '')
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<ProfileTab>('stats')
  const inputRef = useRef<HTMLInputElement>(null)

  // Synchronize active tab with URL hash or search params on mount & popstate
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '')
      if (hash === 'history' || hash === 'account' || hash === 'stats') {
        setActiveTab(hash as ProfileTab)
      } else {
        const params = new URLSearchParams(window.location.search)
        const tabParam = params.get('tab')
        if (tabParam === 'history' || tabParam === 'account' || tabParam === 'stats') {
          setActiveTab(tabParam as ProfileTab)
        }
      }
    }

    handleHash()
    window.addEventListener('hashchange', handleHash)
    window.addEventListener('popstate', handleHash)
    return () => {
      window.removeEventListener('hashchange', handleHash)
      window.removeEventListener('popstate', handleHash)
    }
  }, [])

  const handleTabSwitch = (tab: ProfileTab) => {
    setActiveTab(tab)
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#${tab}`)
    }
  }

  const startEditing = useCallback(() => {
    setDraft(displayName ?? '')
    setEditing(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [displayName])

  const cancelEditing = useCallback(() => {
    setEditing(false)
  }, [])

  const saveName = useCallback(async () => {
    if (!draft.trim() || draft.trim() === displayName) {
      setEditing(false)
      return
    }
    setSaving(true)
    const result = await updateDisplayName(draft)
    setSaving(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    setDisplayName(result.name ?? draft.trim())
    setEditing(false)
    toast.success('Display name updated!')
  }, [draft, displayName])

  const memberSinceLabel = formatMemberSince(memberSince)

  return (
    <div className={styles.profilePage}>
      {/* Hero Header Card */}
      <div className={styles.headerCard}>
        <div className={styles.headerAccent} />
        <div className={styles.headerInner}>
          <div className={styles.identity}>
            <div className={styles.avatar} aria-hidden="true">
              {initialsFor(displayName, email)}
            </div>
            <div className={styles.identityText}>
              {editing ? (
                <div className={styles.nameEditRow}>
                  <input
                    ref={inputRef}
                    className={styles.nameInput}
                    value={draft}
                    maxLength={60}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') saveName()
                      if (e.key === 'Escape') cancelEditing()
                    }}
                    disabled={saving}
                    aria-label="Display name"
                  />
                  <button className={styles.nameSaveBtn} onClick={saveName} disabled={saving} type="button">
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button className={styles.nameCancelBtn} onClick={cancelEditing} disabled={saving} type="button">
                    Cancel
                  </button>
                </div>
              ) : (
                <button className={styles.nameRow} onClick={startEditing} title="Edit display name" type="button">
                  <h1 className={styles.title}>{displayName || 'Add a display name'}</h1>
                  <span className={styles.editIcon} aria-hidden="true">✎</span>
                </button>
              )}
              <p className={styles.subtitle}>{email}</p>
              {memberSinceLabel && (
                <p className={styles.memberSince}>
                  <span aria-hidden="true">📅</span> Member since {memberSinceLabel}
                </p>
              )}
            </div>
          </div>

          <div className={styles.headerActions}>
            <Link href="/settings" className={styles.settingsLink}>⚙️ Settings</Link>
            {children}
          </div>
        </div>
      </div>

      {/* Interactive Navigation Tabs */}
      <nav className={styles.quickNav} aria-label="Profile sections" role="tablist">
        <button
          type="button"
          role="tab"
          id="tab-stats"
          aria-selected={activeTab === 'stats'}
          aria-controls="panel-stats"
          className={`${styles.navTab} ${activeTab === 'stats' ? styles.navTabActive : ''}`}
          onClick={() => handleTabSwitch('stats')}
        >
          <span className={styles.tabIcon}>📊</span>
          <span>Overview &amp; Stats</span>
        </button>

        <button
          type="button"
          role="tab"
          id="tab-history"
          aria-selected={activeTab === 'history'}
          aria-controls="panel-history"
          className={`${styles.navTab} ${activeTab === 'history' ? styles.navTabActive : ''}`}
          onClick={() => handleTabSwitch('history')}
        >
          <span className={styles.tabIcon}>🕘</span>
          <span>Watch History</span>
        </button>

        <button
          type="button"
          role="tab"
          id="tab-account"
          aria-selected={activeTab === 'account'}
          aria-controls="panel-account"
          className={`${styles.navTab} ${activeTab === 'account' ? styles.navTabActive : ''}`}
          onClick={() => handleTabSwitch('account')}
        >
          <span className={styles.tabIcon}>⚙️</span>
          <span>Account Management</span>
        </button>
      </nav>

      {/* Active Tab Panel Content */}
      <div className={styles.tabPanelsWrapper}>
        {activeTab === 'stats' && (
          <section
            id="panel-stats"
            role="tabpanel"
            aria-labelledby="tab-stats"
            className={`${styles.sectionCard} ${styles.activePanel}`}
          >
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                <span>📊</span> Viewing Stats &amp; Insights
              </h2>
              <p className={styles.sectionSubtitle}>
                Comprehensive breakdown of your watching habits, momentum, and favorite genres.
              </p>
            </div>
            <ProfileStats />
          </section>
        )}

        {activeTab === 'history' && (
          <section
            id="panel-history"
            role="tabpanel"
            aria-labelledby="tab-history"
            className={`${styles.sectionCard} ${styles.activePanel}`}
          >
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                <span>🕘</span> Watch History
              </h2>
              <p className={styles.sectionSubtitle}>
                Everything you&apos;ve started or finished watching, synced across your devices.
              </p>
            </div>
            <WatchHistoryList />
          </section>
        )}

        {activeTab === 'account' && (
          <section
            id="panel-account"
            role="tabpanel"
            aria-labelledby="tab-account"
            className={`${styles.sectionCard} ${styles.activePanel}`}
          >
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                <span>⚙️</span> Account Management
              </h2>
              <p className={styles.sectionSubtitle}>
                Update your password or manage account settings.
              </p>
            </div>
            <AccountSettings />
          </section>
        )}
      </div>
    </div>
  )
}
