'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import toast from 'react-hot-toast'
import { changePassword, deleteAccount } from '@/app/actions/auth'
import Modal from './Modal'
import styles from './AccountSettings.module.css'

export default function AccountSettings() {
  const router = useRouter()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changing, setChanging] = useState(false)

  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleting, setDeleting] = useState(false)

  const handleChangePassword = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error("New passwords don't match.")
      return
    }
    setChanging(true)
    const result = await changePassword(currentPassword, newPassword)
    setChanging(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success('Password updated!')
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }, [currentPassword, newPassword, confirmPassword])

  const closeDeleteModal = useCallback(() => {
    setDeleteModalOpen(false)
    setDeletePassword('')
  }, [])

  const handleDeleteAccount = useCallback(async () => {
    if (!deletePassword) {
      toast.error('Enter your password to confirm.')
      return
    }
    setDeleting(true)
    const result = await deleteAccount(deletePassword)
    setDeleting(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    setDeleteModalOpen(false)
    await signOut({ redirect: false })
    router.push('/')
    router.refresh()
  }, [deletePassword, router])

  return (
    <div className={styles.wrapper}>
      <form onSubmit={handleChangePassword} className={styles.form}>
        <h3 className={styles.subheading}>Change Password</h3>
        <div className={styles.field}>
          <label htmlFor="currentPassword">Current Password</label>
          <input
            id="currentPassword"
            type="password"
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            className={styles.input}
            required
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="newPassword">New Password</label>
          <input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            className={styles.input}
            minLength={6}
            required
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="confirmPassword">Confirm New Password</label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            className={styles.input}
            minLength={6}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={changing}>
          {changing ? 'Updating…' : 'Update Password'}
        </button>
      </form>

      <div className={styles.dangerZone}>
        <h3 className={styles.dangerTitle}>
          <span>⚠️</span> Danger Zone
        </h3>
        <p className={styles.dangerText}>
          Permanently delete your account, watch history, progress, and My List. This action cannot be undone.
        </p>
        <button type="button" className={styles.deleteBtn} onClick={() => setDeleteModalOpen(true)}>
          Delete Account
        </button>
      </div>

      <Modal
        isOpen={deleteModalOpen}
        title="Delete Account"
        description="This permanently deletes your account and everything tied to it — watch history, progress, and My List. This cannot be undone. Enter your password to confirm."
        confirmText={deleting ? 'Deleting…' : 'Delete Account'}
        onConfirm={handleDeleteAccount}
        onCancel={closeDeleteModal}
      >
        <input
          type="password"
          value={deletePassword}
          onChange={e => setDeletePassword(e.target.value)}
          placeholder="Your password"
          className={styles.input}
          autoFocus
        />
      </Modal>
    </div>
  )
}
