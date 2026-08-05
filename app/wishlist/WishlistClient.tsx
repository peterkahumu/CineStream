'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import MediaCard from '@/components/MediaCard'
import { MediaItem } from '@/lib/tmdb'
import {
  type WishlistItem as SavedWishlistItem,
  getWishlist,
  mergeRemoteWishlist,
  setWatched,
  removeFromWishlist,
  setFolder,
} from '@/lib/wishlistTracker'
import styles from './WishlistClient.module.css'

import Modal from '@/components/Modal'

export default function WishlistClient() {
  const { status } = useSession()
  const isAuthenticated = status === 'authenticated'
  const [items, setItems] = useState<SavedWishlistItem[]>([])
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'title-asc'>('date-desc')
  const [folderModalItem, setFolderModalItem] = useState<{ id: string; mediaType: 'movie' | 'tv'; folderName?: string } | null>(null)
  const [customFolders, setCustomFolders] = useState<string[]>([])
  const [newFolderModalOpen, setNewFolderModalOpen] = useState(false)
  const [newFolderInput, setNewFolderInput] = useState('')
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null)
  const [itemToRemove, setItemToRemove] = useState<SavedWishlistItem | null>(null)

  useEffect(() => {
    setMounted(true)
    setItems(getWishlist())
    try {
      const storedFolders = localStorage.getItem('cinemaphora-wishlist-folders')
      if (storedFolders) {
        setCustomFolders(JSON.parse(storedFolders))
      }
    } catch (e) {
      console.error('Failed to parse wishlist folders', e)
    }
  }, [])

  // Reconcile with the DB copy whenever a signed-in user visits this page —
  // same background-sync pattern as ContinueWatchingRow.
  useEffect(() => {
    if (!isAuthenticated) return
    fetch('/api/get-watchlist')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          mergeRemoteWishlist(data)
          setItems(getWishlist())
        }
      })
      .catch(err => console.error('[WishlistClient] sync failed:', err))
  }, [isAuthenticated])

  const handleToggleWatched = useCallback((id: string, mediaType: 'movie' | 'tv', currentlyWatched: boolean) => {
    setItems(setWatched(id, mediaType, !currentlyWatched, isAuthenticated))
  }, [isAuthenticated])

  const confirmRemove = useCallback(() => {
    if (!itemToRemove) return
    setItems(removeFromWishlist(itemToRemove.id, itemToRemove.mediaType, isAuthenticated))
    setItemToRemove(null)
  }, [isAuthenticated, itemToRemove])

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (activeTab === 'all') return true
      if (activeTab === 'watched') return item.watchedAt != null
      if (activeTab === 'to-watch') return item.watchedAt == null
      return item.folderName === activeTab
    })
  }, [items, activeTab])

  const folders = useMemo(() => {
    const itemFolders = items.map(i => i.folderName).filter(Boolean) as string[]
    return Array.from(new Set([...customFolders, ...itemFolders]))
  }, [items, customFolders])

  const handleCreateFolder = () => {
    const name = newFolderInput.trim()
    if (!name) return
    const updated = Array.from(new Set([...customFolders, name]))
    setCustomFolders(updated)
    localStorage.setItem('cinemaphora-wishlist-folders', JSON.stringify(updated))
    setNewFolderModalOpen(false)
    setNewFolderInput('')
    // If we got here from a card's folder picker, assign the new folder right away
    // instead of leaving the user to reopen the picker and select it themselves.
    if (folderModalItem) {
      setItems(setFolder(folderModalItem.id, folderModalItem.mediaType, name, isAuthenticated))
      setFolderModalItem(null)
    }
  }

  const handleSelectFolder = (folderName: string | undefined) => {
    if (!folderModalItem) return
    setItems(setFolder(folderModalItem.id, folderModalItem.mediaType, folderName, isAuthenticated))
    setFolderModalItem(null)
  }

  const confirmDeleteFolder = () => {
    if (!folderToDelete) return
    setCustomFolders(prev => {
      const next = prev.filter(f => f !== folderToDelete)
      localStorage.setItem('cinemaphora-wishlist-folders', JSON.stringify(next))
      return next
    })
    let next = items
    for (const item of items) {
      if (item.folderName === folderToDelete) {
        next = setFolder(item.id, item.mediaType, undefined, isAuthenticated)
      }
    }
    setItems(next)
    if (activeTab === folderToDelete) setActiveTab('all')
    setFolderToDelete(null)
  }

  const sortedItems = useMemo(() => {
    const list = [...filteredItems]
    list.sort((a, b) => {
      if (sortBy === 'title-asc') {
        return a.title.localeCompare(b.title)
      }
      if (sortBy === 'date-asc') {
        return (a.addedAt || 0) - (b.addedAt || 0)
      }
      return (b.addedAt || 0) - (a.addedAt || 0)
    })
    return list
  }, [filteredItems, sortBy])

  // Stats calculation
  const stats = useMemo(() => {
    const toWatchList = items.filter(i => !i.watchedAt)
    const moviesCount = toWatchList.filter(i => i.mediaType === 'movie').length
    const tvCount = toWatchList.filter(i => i.mediaType === 'tv').length
    // rough estimates: movie=2h, tv=10h (1 season)
    const estimatedHours = (moviesCount * 2) + (tvCount * 10)
    return { count: toWatchList.length, hours: estimatedHours }
  }, [items])

  if (!mounted) {
    return <div className={styles.skeletonSpacer} /> // Skeleton or empty space until hydrated
  }

  if (items.length === 0) {
    return (
      <div className={styles.emptyState}>
        <span className={styles.emptyIcon}>🍿</span>
        <h2 className={styles.emptyTitle}>Your list is empty</h2>
        <p className={styles.emptyText}>Save shows and movies to keep track of what you want to watch.</p>
        <Link href="/discover" className="btn btn-primary">
          Discover Content
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className={styles.header}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tabBtn} ${activeTab === 'all' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All ({items.length})
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'to-watch' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('to-watch')}
          >
            To Watch ({items.filter(i => !i.watchedAt).length})
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'watched' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('watched')}
          >
            Watched ({items.filter(i => i.watchedAt).length})
          </button>
          {folders.map(f => (
            <div key={f} className={styles.folderTabWrapper}>
              <button
                className={`${styles.tabBtn} ${activeTab === f ? styles.tabBtnActive : ''} ${styles.folderTabName}`}
                onClick={() => setActiveTab(f)}
              >
                📁 {f} ({items.filter(i => i.folderName === f).length})
              </button>
              <button
                className={`${styles.tabBtn} ${activeTab === f ? styles.tabBtnActive : ''} ${styles.folderTabDelete} ${activeTab === f ? styles.folderTabDeleteActive : ''}`}
                onClick={() => setFolderToDelete(f)}
                title="Delete Folder"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            className={`${styles.tabBtn} ${styles.newFolderBtn}`}
            onClick={() => setNewFolderModalOpen(true)}
          >
            + New Folder
          </button>
        </div>

        <div className={styles.controls}>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'date-desc' | 'date-asc' | 'title-asc')}
            className={styles.sortSelect}
          >
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="title-asc">Title (A-Z)</option>
          </select>
        </div>
      </div>

      {activeTab === 'to-watch' && stats.count > 0 && (
        <div className={styles.statsBar}>
          <span><strong>{stats.count}</strong> titles remaining</span>
          <span className={styles.statsDot}>·</span>
          <span>~{stats.hours} hours of watch time</span>
        </div>
      )}

      {sortedItems.length === 0 ? (
        <div className={`${styles.emptyState} ${styles.emptyStatePadding}`}>
          <p className={styles.emptyText}>
            {activeTab === 'watched'
              ? "You haven't marked anything as watched yet."
              : activeTab === 'all'
                ? "Your list is empty."
                : "You've watched everything on your list!"}
          </p>
        </div>
      ) : (
        <div className="media-grid">
          {sortedItems.map(item => {
            const mediaItem: MediaItem = {
              id: Number(item.id),
              title: item.title,
              name: item.title,
              poster_path: item.poster,
              backdrop_path: item.backdrop,
              media_type: item.mediaType
            } as MediaItem

            const isWatched = !!item.watchedAt

            return (
              <div key={item.id} className={styles.cardWrap}>
                <MediaCard
                  item={mediaItem}
                  forcedType={item.mediaType}
                  bottomSubtitle={item.folderName ? <>📁 {item.folderName}</> : undefined}
                />
                <div className={styles.actionsBar}>
                  <button
                    className={`${styles.iconBtn} ${isWatched ? styles.watchedActive : ''}`}
                    onClick={() => handleToggleWatched(item.id, item.mediaType, isWatched)}
                    title={isWatched ? 'Mark as un-watched' : 'Mark as watched'}
                  >
                    <span aria-hidden="true">{isWatched ? '☑' : '☐'}</span> Watched
                  </button>
                  <button
                    className={styles.iconBtn}
                    onClick={() => setFolderModalItem({ id: item.id, mediaType: item.mediaType, folderName: item.folderName })}
                    title={item.folderName ? `Folder: ${item.folderName}` : 'Add to folder'}
                  >
                    <span aria-hidden="true">🏷</span> Folder
                  </button>
                  <button
                    className={`${styles.iconBtn} ${styles.removeIconBtn}`}
                    onClick={() => setItemToRemove(item)}
                    title="Remove from list"
                  >
                    <span aria-hidden="true">🗑</span> Remove
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal
        isOpen={!!folderModalItem}
        title="Add to Folder"
        description="Pick a folder to file this under."
        confirmText="Done"
        hideCancel
        onConfirm={() => setFolderModalItem(null)}
        onCancel={() => setFolderModalItem(null)}
      >
        <div className={styles.folderPickerList}>
          <button
            className={`${styles.folderPickerRow} ${!folderModalItem?.folderName ? styles.folderPickerRowActive : ''}`}
            onClick={() => handleSelectFolder(undefined)}
          >
            <span>🚫 No Folder</span>
            {!folderModalItem?.folderName && <span aria-hidden="true">✓</span>}
          </button>
          {customFolders.map(f => (
            <button
              key={f}
              className={`${styles.folderPickerRow} ${folderModalItem?.folderName === f ? styles.folderPickerRowActive : ''}`}
              onClick={() => handleSelectFolder(f)}
            >
              <span>📁 {f}</span>
              {folderModalItem?.folderName === f && <span aria-hidden="true">✓</span>}
            </button>
          ))}
          <button
            className={`${styles.folderPickerRow} ${styles.folderPickerNew}`}
            onClick={() => setNewFolderModalOpen(true)}
          >
            + New Folder
          </button>
        </div>
      </Modal>
      <Modal
        isOpen={newFolderModalOpen}
        title="Create New Folder"
        description="Organise your list with custom folders like 'Watch Tonight' or 'With Partner'."
        confirmText="Create"
        onConfirm={handleCreateFolder}
        onCancel={() => setNewFolderModalOpen(false)}
      >
        <div className={styles.modalContentGroup}>
          <input
            type="text"
            value={newFolderInput}
            onChange={(e) => setNewFolderInput(e.target.value)}
            placeholder="Folder Name"
            className={styles.modalInput}
            autoFocus
          />
        </div>
      </Modal>

      <Modal
        isOpen={!!folderToDelete}
        title="Delete Folder"
        description={`Are you sure you want to delete the folder "${folderToDelete}"? Items inside will not be deleted from your wishlist.`}
        confirmText="Delete"
        onConfirm={confirmDeleteFolder}
        onCancel={() => setFolderToDelete(null)}
      />

      <Modal
        isOpen={!!itemToRemove}
        title="Remove from My List"
        description={`Are you sure you want to remove "${itemToRemove?.title}" from your list?`}
        confirmText="Remove"
        onConfirm={confirmRemove}
        onCancel={() => setItemToRemove(null)}
      />
    </div>
  )
}
