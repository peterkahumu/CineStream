'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import MediaCard from '@/components/MediaCard'
import { MediaItem } from '@/lib/tmdb'
import styles from './WishlistClient.module.css'

interface SavedWishlistItem {
  id: string
  mediaType: 'movie' | 'tv'
  title: string
  poster: string | null
  backdrop: string | null
  addedAt: number
  watchedAt?: number // Optional timestamp for watched items
  folderName?: string
}

import Modal from '@/components/Modal'

const WISHLIST_KEY = 'cinemaphora-wishlist'

export default function WishlistClient() {
  const [items, setItems] = useState<SavedWishlistItem[]>([])
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'title-asc'>('date-desc')
  const [folderModalItem, setFolderModalItem] = useState<string | null>(null)
  const [folderInput, setFolderInput] = useState('')
  const [customFolders, setCustomFolders] = useState<string[]>([])
  const [newFolderModalOpen, setNewFolderModalOpen] = useState(false)
  const [newFolderInput, setNewFolderInput] = useState('')
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
    try {
      const stored = localStorage.getItem(WISHLIST_KEY)
      if (stored) {
        setItems(JSON.parse(stored))
      }
      const storedFolders = localStorage.getItem('cinemaphora-wishlist-folders')
      if (storedFolders) {
        setCustomFolders(JSON.parse(storedFolders))
      }
    } catch (e) {
      console.error('Failed to parse wishlist', e)
    }
  }, [])

  const handleToggleWatched = useCallback((id: string, currentlyWatched: boolean) => {
    setItems(prev => {
      const next = prev.map(item => {
        if (item.id === id) {
          return {
            ...item,
            watchedAt: currentlyWatched ? undefined : Date.now()
          }
        }
        return item
      })
      localStorage.setItem(WISHLIST_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const handleRemove = useCallback((id: string) => {
    setItems(prev => {
      const next = prev.filter(i => i.id !== id)
      localStorage.setItem(WISHLIST_KEY, JSON.stringify(next))
      return next
    })
  }, [])

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
    if (!newFolderInput.trim()) return
    const updated = Array.from(new Set([...customFolders, newFolderInput.trim()]))
    setCustomFolders(updated)
    localStorage.setItem('cinemaphora-wishlist-folders', JSON.stringify(updated))
    setNewFolderModalOpen(false)
    setNewFolderInput('')
  }

  const handleSaveFolder = () => {
    if (!folderModalItem) return
    setItems(prev => {
      const next = prev.map(item => {
        if (item.id === folderModalItem) {
          return { ...item, folderName: folderInput.trim() || undefined }
        }
        return item
      })
      localStorage.setItem(WISHLIST_KEY, JSON.stringify(next))
      return next
    })
    setFolderModalItem(null)
    setFolderInput('')
  }

  const confirmDeleteFolder = () => {
    if (!folderToDelete) return
    setCustomFolders(prev => {
      const next = prev.filter(f => f !== folderToDelete)
      localStorage.setItem('cinemaphora-wishlist-folders', JSON.stringify(next))
      return next
    })
    setItems(prev => {
      const next = prev.map(item => item.folderName === folderToDelete ? { ...item, folderName: undefined } : item)
      localStorage.setItem(WISHLIST_KEY, JSON.stringify(next))
      return next
    })
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
            onChange={(e) => setSortBy(e.target.value as any)}
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
        <div className={styles.grid}>
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
                <MediaCard item={mediaItem} forcedType={item.mediaType} />
                {activeTab === 'all' && (
                  <div className={`${styles.statusPill} ${isWatched ? styles.statusWatched : styles.statusToWatch}`}>
                    {isWatched ? '✓ Watched' : 'To Watch'}
                  </div>
                )}
                <div className={styles.cardActions} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button 
                      className={`${styles.actionBtn} ${isWatched ? styles.watchedBtn : ''}`}
                      onClick={() => handleToggleWatched(item.id, isWatched)}
                      title={isWatched ? "Mark as un-watched" : "Mark as watched"}
                    >
                      {isWatched ? '✓ Watched' : 'Mark Watched'}
                    </button>
                    <button 
                      className={styles.removeBtn}
                      onClick={() => handleRemove(item.id)}
                      title="Remove from list"
                    >
                      ✕
                    </button>
                  </div>
                  <button
                    className={styles.actionBtn}
                    onClick={() => {
                      setFolderModalItem(item.id)
                      setFolderInput(item.folderName || '')
                    }}
                    style={{ background: 'rgba(255, 255, 255, 0.1)', color: 'white' }}
                  >
                    📁 {item.folderName || 'Add to Folder'}
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
        description="Organise your list with custom folders like 'Watch Tonight' or 'With Partner'."
        confirmText="Save"
        onConfirm={handleSaveFolder}
        onCancel={() => setFolderModalItem(null)}
      >
        <div className={styles.modalContentGroup}>
          <input 
            type="text" 
            value={folderInput}
            onChange={(e) => setFolderInput(e.target.value)}
            placeholder="E.g. Watch with Partner"
            className={styles.modalInput}
            autoFocus
          />
          
          <div className={styles.modalFolderList}>
            {customFolders.map(f => (
              <button 
                key={f} 
                className="btn btn-secondary" 
                onClick={() => {
                  setFolderInput(f)
                }}
              >
                📁 {f}
              </button>
            ))}
          </div>
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
    </div>
  )
}
