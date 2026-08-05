'use client'

import { useState, useRef, useCallback, type ReactNode } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { updateDisplayName } from '@/app/actions/auth'
import ProfileStats from '@/components/ProfileStats'
import WatchHistoryList from '@/components/WatchHistoryList'
import AccountSettings from '@/components/AccountSettings'
import styles from './Profile.module.css'

interface Props {
  name: string | null
  email: string
  memberSince: string | null
  /** Server-rendered Sign Out form, injected as a slot (see page.tsx). */
  children?: ReactNode
}

/* helpers */

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

/* component */

export default function ProfileClient({ name, email, memberSince, children }: Props) {
  const [displayName, setDisplayName] = useState(name)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(name ?? '')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

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
      {/* hero */}
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
                  <button className={styles.nameSaveBtn} onClick={saveName} disabled={saving}>
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button className={styles.nameCancelBtn} onClick={cancelEditing} disabled={saving}>
                    Cancel
                  </button>
                </div>
              ) : (
                <button className={styles.nameRow} onClick={startEditing} title="Edit display name">
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

      {/* grid */}
      <div className={styles.contentGrid}>
        {/* main */}
        <div className={styles.mainColumn}>
          {/* history */}
          <div className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Watch History</h2>
            </div>
            <p className={styles.sectionSubtitle}>
              Everything you&apos;ve started or finished watching, synced across your devices.
            </p>
            <WatchHistoryList />
          </div>
        </div>

        {/* side */}
        <div className={styles.sideColumn}>
          <div className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Your Stats</h2>
            </div>
            <ProfileStats />
          </div>

          <div className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Account</h2>
            </div>
            <AccountSettings />
          </div>
        </div>
      </div>
    </div>
  )
}
