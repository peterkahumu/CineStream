'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import { posterUrl } from '@/lib/tmdb'
import { useSettings } from '@/components/SettingsProvider'
import {
  type WishlistItem as SavedWishlistItem,
  getWishlist,
  mergeRemoteWishlist,
  setWatched,
  removeFromWishlist,
  setFolder,
} from '@/lib/wishlistTracker'
import Modal from '@/components/Modal'
import styles from './WishlistClient.module.css'

function formatRelativeTime(timestamp: number): string {
  if (!timestamp) return ''
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}y ago`
}

export default function WishlistClient() {
  const { status } = useSession()
  const { settings } = useSettings()
  const isAuthenticated = status === 'authenticated'

  const [items, setItems] = useState<SavedWishlistItem[]>([])
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'title-asc'>('date-desc')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const [folderModalItem, setFolderModalItem] = useState<{
    id: string
    mediaType: 'movie' | 'tv'
    folderName?: string
  } | null>(null)
  const [customFolders, setCustomFolders] = useState<string[]>([])
  const [newFolderModalOpen, setNewFolderModalOpen] = useState(false)
  const [newFolderInput, setNewFolderInput] = useState('')
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null)
  const [itemToRemove, setItemToRemove] = useState<SavedWishlistItem | null>(null)

  const isSyncingRef = useRef(false)

  // 1. Initial local load
  useEffect(() => {
    setMounted(true)
    setItems(getWishlist())

    try {
      const storedFolders = localStorage.getItem('cinemaphora-wishlist-folders')
      if (storedFolders) {
        setCustomFolders(JSON.parse(storedFolders))
      }
      const storedView = localStorage.getItem('cinemaphora-wishlist-view')
      if (storedView === 'list' || storedView === 'grid') {
        setViewMode(storedView)
      }
    } catch (e) {
      console.error('[WishlistClient] Failed to load local settings:', e)
    }
  }, [])

  // 2. Multi-tab sync via storage events
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'cinemaphora-wishlist' && e.newValue) {
        try {
          setItems(JSON.parse(e.newValue))
        } catch {}
      }
      if (e.key === 'cinemaphora-wishlist-folders' && e.newValue) {
        try {
          setCustomFolders(JSON.parse(e.newValue))
        } catch {}
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  // 3. Silent cross-device background sync
  const pullRemoteWishlist = useCallback(async () => {
    if (!isAuthenticated || isSyncingRef.current) return
    isSyncingRef.current = true
    try {
      const res = await fetch('/api/get-watchlist')
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          const merged = mergeRemoteWishlist(data)
          setItems(merged)
        }
      }
    } catch (err) {
      console.error('[WishlistClient] Silent background sync error:', err)
    } finally {
      isSyncingRef.current = false
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated) return

    // Initial pull on login / page open
    pullRemoteWishlist()

    // Background interval sync every 60s
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        pullRemoteWishlist()
      }
    }, 60_000)

    // Re-sync immediately on tab focus
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        pullRemoteWishlist()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isAuthenticated, pullRemoteWishlist])

  // Handlers
  const handleToggleWatched = useCallback(
    (id: string, mediaType: 'movie' | 'tv', currentlyWatched: boolean) => {
      setItems(setWatched(id, mediaType, !currentlyWatched, isAuthenticated))
    },
    [isAuthenticated]
  )

  const confirmRemove = useCallback(() => {
    if (!itemToRemove) return
    setItems(removeFromWishlist(itemToRemove.id, itemToRemove.mediaType, isAuthenticated))
    setItemToRemove(null)
  }, [isAuthenticated, itemToRemove])

  const handleSelectFolder = useCallback(
    (folderName: string | undefined) => {
      if (!folderModalItem) return
      setItems(setFolder(folderModalItem.id, folderModalItem.mediaType, folderName, isAuthenticated))
      setFolderModalItem(null)
    },
    [folderModalItem, isAuthenticated]
  )

  const handleCreateFolder = () => {
    const name = newFolderInput.trim()
    if (!name) return
    const updated = Array.from(new Set([...customFolders, name]))
    setCustomFolders(updated)
    try {
      localStorage.setItem('cinemaphora-wishlist-folders', JSON.stringify(updated))
    } catch {}
    setNewFolderModalOpen(false)
    setNewFolderInput('')

    if (folderModalItem) {
      setItems(setFolder(folderModalItem.id, folderModalItem.mediaType, name, isAuthenticated))
      setFolderModalItem(null)
    }
  }

  const confirmDeleteFolder = () => {
    if (!folderToDelete) return
    setCustomFolders(prev => {
      const next = prev.filter(f => f !== folderToDelete)
      try {
        localStorage.setItem('cinemaphora-wishlist-folders', JSON.stringify(next))
      } catch {}
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

  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode)
    try {
      localStorage.setItem('cinemaphora-wishlist-view', mode)
    } catch {}
  }

  // Filtered & Searched & Sorted items
  const allFolders = useMemo(() => {
    const itemFolders = items.map(i => i.folderName).filter(Boolean) as string[]
    return Array.from(new Set([...customFolders, ...itemFolders]))
  }, [items, customFolders])

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Tab filter
      if (activeTab === 'watched' && !item.watchedAt) return false
      if (activeTab === 'to-watch' && item.watchedAt) return false
      if (activeTab !== 'all' && activeTab !== 'watched' && activeTab !== 'to-watch') {
        if (item.folderName !== activeTab) return false
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchesTitle = item.title?.toLowerCase().includes(q)
        const matchesFolder = item.folderName?.toLowerCase().includes(q)
        if (!matchesTitle && !matchesFolder) return false
      }

      return true
    })
  }, [items, activeTab, searchQuery])

  const sortedItems = useMemo(() => {
    const list = [...filteredItems]
    list.sort((a, b) => {
      if (sortBy === 'title-asc') {
        return (a.title || '').localeCompare(b.title || '')
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
    const estHours = Math.round(moviesCount * 2 + tvCount * 8)
    return { count: toWatchList.length, hours: estHours, total: items.length, watched: items.length - toWatchList.length }
  }, [items])

  if (!mounted) {
    return <div className={styles.skeletonSpacer} />
  }

  return (
    <div className={styles.container}>
      {/* ── HEADER / CONTROLS (Option 3) ── */}
      <div className={styles.header}>
        {/* Navigation & Folder Tabs */}
        <div className={styles.tabsWrapper}>
          <div className={styles.tabs}>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === 'all' ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab('all')}
            >
              All ({items.length})
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === 'to-watch' ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab('to-watch')}
            >
              To Watch ({stats.count})
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === 'watched' ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab('watched')}
            >
              Watched ({stats.watched})
            </button>

            {allFolders.map(folder => {
              const count = items.filter(i => i.folderName === folder).length
              return (
                <div key={folder} className={styles.folderTabWrapper}>
                  <button
                    type="button"
                    className={`${styles.tabBtn} ${styles.folderTabName} ${activeTab === folder ? styles.tabBtnActive : ''}`}
                    onClick={() => setActiveTab(folder)}
                  >
                    📁 {folder} ({count})
                  </button>
                  <button
                    type="button"
                    className={`${styles.tabBtn} ${styles.folderTabDelete} ${activeTab === folder ? styles.folderTabDeleteActive : ''}`}
                    onClick={e => {
                      e.stopPropagation()
                      setFolderToDelete(folder)
                    }}
                    title={`Delete folder "${folder}"`}
                    aria-label={`Delete folder ${folder}`}
                  >
                    ×
                  </button>
                </div>
              )
            })}

            <button
              type="button"
              className={`${styles.tabBtn} ${styles.newFolderBtn}`}
              onClick={() => setNewFolderModalOpen(true)}
              title="Create a new folder"
            >
              + New Folder
            </button>
          </div>
        </div>

        {/* Search, Sort, View Toggle Bar */}
        <div className={styles.controlsBar}>
          {/* Instant Search Box */}
          <div className={styles.searchBox}>
            <span className={styles.searchIcon} aria-hidden="true">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search wishlist..."
              className={styles.searchInput}
            />
            {searchQuery && (
              <button
                type="button"
                className={styles.searchClearBtn}
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as 'date-desc' | 'date-asc' | 'title-asc')}
            className={styles.sortSelect}
            aria-label="Sort by"
          >
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="title-asc">Title (A-Z)</option>
          </select>

          {/* View Mode Switcher */}
          <div className={styles.viewModeToggle} role="group" aria-label="View mode">
            <button
              type="button"
              className={`${styles.viewToggleBtn} ${viewMode === 'grid' ? styles.viewToggleBtnActive : ''}`}
              onClick={() => handleViewModeChange('grid')}
              title="Grid View"
              aria-label="Grid View"
            >
              ⊞
            </button>
            <button
              type="button"
              className={`${styles.viewToggleBtn} ${viewMode === 'list' ? styles.viewToggleBtnActive : ''}`}
              onClick={() => handleViewModeChange('list')}
              title="List View"
              aria-label="List View"
            >
              ☰
            </button>
          </div>
        </div>
      </div>

      {/* ── STATS BAR ── */}
      {stats.count > 0 && activeTab !== 'watched' && (
        <div className={styles.statsBar}>
          <span><strong>{stats.count}</strong> titles to watch</span>
          <span className={styles.statsDot}>·</span>
          <span>~{stats.hours} hours estimated watch time</span>
        </div>
      )}

      {/* ── EMPTY STATES ── */}
      {sortedItems.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon} aria-hidden="true">🎬</span>
          <h3 className={styles.emptyTitle}>
            {searchQuery ? 'No matching titles' : 'Your list is empty'}
          </h3>
          <p className={styles.emptyText}>
            {searchQuery
              ? `No items found matching "${searchQuery}"`
              : activeTab === 'watched'
                ? "You haven't marked anything as watched yet."
                : activeTab === 'all'
                  ? 'Browse movies and series and add them to your list!'
                  : "You've watched everything in this tab!"}
          </p>
          {searchQuery ? (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setSearchQuery('')}
            >
              Clear Search
            </button>
          ) : (
            <Link href="/discover" className="btn btn-primary">
              Explore Titles
            </Link>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* ── OPTION 1: Modern Grid with Floating Micro-Actions & Standard Card Sizing ── */
        <div className={styles.mediaGrid}>
          {sortedItems.map(item => {
            const isWatched = !!item.watchedAt
            const posterSrc = posterUrl(item.poster, settings.dataSaver ? 'w185' : 'w342')
            const href = `/details/${item.id}?type=${item.mediaType}`

            return (
              <div key={`${item.mediaType}-${item.id}`} className={styles.gridCard}>
                {/* Poster Box with Overlays */}
                <div className={`${styles.posterContainer} ${isWatched ? styles.posterWatched : ''}`}>
                  <Link href={href} className={styles.posterLink} tabIndex={-1}>
                    {posterSrc ? (
                      <Image
                        src={posterSrc}
                        alt={item.title || 'Poster'}
                        fill
                        sizes="(max-width: 640px) 100px, (max-width: 1024px) 168px, 185px"
                        className={styles.posterImage}
                      />
                    ) : (
                      <div className={styles.noPoster}>
                        <span aria-hidden="true">🎬</span>
                        <span className={styles.noPosterTitle}>{item.title}</span>
                      </div>
                    )}
                  </Link>

                  {/* Top-Left: 1-Click Watched Toggle Badge */}
                  <button
                    type="button"
                    className={`${styles.watchedBadge} ${isWatched ? styles.watchedBadgeActive : ''}`}
                    onClick={e => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleToggleWatched(item.id, item.mediaType, isWatched)
                    }}
                    title={isWatched ? 'Mark as unwatched' : 'Mark as watched'}
                    aria-label={isWatched ? 'Mark as unwatched' : 'Mark as watched'}
                  >
                    {isWatched ? (
                      <>
                        <span className={styles.checkIcon} aria-hidden="true">✓</span>
                        <span className={styles.badgeLabel}>Watched</span>
                      </>
                    ) : (
                      <>
                        <span className={styles.eyeIcon} aria-hidden="true">👁</span>
                        <span className={styles.badgeLabel}>Watch</span>
                      </>
                    )}
                  </button>

                  {/* Top-Right: Quick Remove Button */}
                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={e => {
                      e.preventDefault()
                      e.stopPropagation()
                      setItemToRemove(item)
                    }}
                    title="Remove from list"
                    aria-label="Remove from list"
                  >
                    ×
                  </button>

                  {/* Bottom Overlay: Folder Chip */}
                  <button
                    type="button"
                    className={`${styles.folderOverlayChip} ${item.folderName ? styles.folderOverlayChipAssigned : ''}`}
                    onClick={e => {
                      e.preventDefault()
                      e.stopPropagation()
                      setFolderModalItem({ id: item.id, mediaType: item.mediaType, folderName: item.folderName })
                    }}
                    title={item.folderName ? `Folder: ${item.folderName}` : 'Assign to folder'}
                  >
                    📁 {item.folderName || '+ Folder'}
                  </button>
                </div>

                {/* Card Title & Meta Info Below Poster */}
                <div className={styles.cardInfo}>
                  <Link href={href} className={styles.cardTitle} title={item.title}>
                    {item.title}
                  </Link>
                  <div className={styles.cardMeta}>
                    <span className={styles.mediaTypeBadge}>
                      {item.mediaType === 'tv' ? 'TV' : 'MOVIE'}
                    </span>
                    {item.addedAt && (
                      <span className={styles.addedDate}>
                        {formatRelativeTime(item.addedAt)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* ── OPTION 3: Responsive List View Rows ── */
        <div className={styles.listContainer}>
          {sortedItems.map(item => {
            const isWatched = !!item.watchedAt
            const posterSrc = posterUrl(item.poster, 'w185')
            const href = `/details/${item.id}?type=${item.mediaType}`

            return (
              <div
                key={`${item.mediaType}-${item.id}`}
                className={`${styles.listRow} ${isWatched ? styles.listRowWatched : ''}`}
              >
                {/* Thumbnail */}
                <Link href={href} className={styles.listThumbLink}>
                  <div className={styles.listThumb}>
                    {posterSrc ? (
                      <Image
                        src={posterSrc}
                        alt={item.title || 'Thumbnail'}
                        fill
                        sizes="50px"
                        className={styles.listThumbImg}
                      />
                    ) : (
                      <div className={styles.listNoThumb}>🎬</div>
                    )}
                  </div>
                </Link>

                {/* Content & Metadata */}
                <div className={styles.listContent}>
                  <div className={styles.listTitleRow}>
                    <Link href={href} className={styles.listTitle}>
                      {item.title}
                    </Link>
                    <span className={styles.listTypeBadge}>
                      {item.mediaType === 'tv' ? 'TV Series' : 'Movie'}
                    </span>
                  </div>

                  <div className={styles.listMetaRow}>
                    {item.folderName && (
                      <button
                        type="button"
                        className={styles.listFolderTag}
                        onClick={() =>
                          setFolderModalItem({
                            id: item.id,
                            mediaType: item.mediaType,
                            folderName: item.folderName,
                          })
                        }
                      >
                        📁 {item.folderName}
                      </button>
                    )}
                    {item.addedAt && (
                      <span className={styles.listDate}>
                        Added {formatRelativeTime(item.addedAt)}
                      </span>
                    )}
                    {isWatched && (
                      <span className={styles.listWatchedTag}>
                        ✓ Watched
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions Toolbar */}
                <div className={styles.listActions}>
                  <button
                    type="button"
                    className={`${styles.listActionBtn} ${isWatched ? styles.listActionBtnWatched : ''}`}
                    onClick={() => handleToggleWatched(item.id, item.mediaType, isWatched)}
                    title={isWatched ? 'Mark as unwatched' : 'Mark as watched'}
                  >
                    {isWatched ? '✓ Watched' : 'Mark Watched'}
                  </button>

                  <button
                    type="button"
                    className={styles.listActionBtn}
                    onClick={() =>
                      setFolderModalItem({
                        id: item.id,
                        mediaType: item.mediaType,
                        folderName: item.folderName,
                      })
                    }
                    title="Change Folder"
                  >
                    📁 {item.folderName ? 'Folder' : '+ Folder'}
                  </button>

                  <Link href={href} className={styles.listViewBtn}>
                    View
                  </Link>

                  <button
                    type="button"
                    className={`${styles.listActionBtn} ${styles.listRemoveBtn}`}
                    onClick={() => setItemToRemove(item)}
                    title="Remove from list"
                    aria-label="Remove"
                  >
                    🗑
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── MODALS ── */}

      {/* Add to Folder Modal */}
      <Modal
        isOpen={!!folderModalItem}
        title="Organise into Folder"
        description="Pick a folder to organize your saved titles."
        confirmText="Done"
        hideCancel
        onConfirm={() => setFolderModalItem(null)}
        onCancel={() => setFolderModalItem(null)}
      >
        <div className={styles.folderPickerList}>
          <button
            type="button"
            className={`${styles.folderPickerRow} ${!folderModalItem?.folderName ? styles.folderPickerRowActive : ''}`}
            onClick={() => handleSelectFolder(undefined)}
          >
            <span>🚫 No Folder</span>
            {!folderModalItem?.folderName && <span aria-hidden="true">✓</span>}
          </button>
          {allFolders.map(f => (
            <button
              type="button"
              key={f}
              className={`${styles.folderPickerRow} ${folderModalItem?.folderName === f ? styles.folderPickerRowActive : ''}`}
              onClick={() => handleSelectFolder(f)}
            >
              <span>📁 {f}</span>
              {folderModalItem?.folderName === f && <span aria-hidden="true">✓</span>}
            </button>
          ))}
          <button
            type="button"
            className={`${styles.folderPickerRow} ${styles.folderPickerNew}`}
            onClick={() => setNewFolderModalOpen(true)}
          >
            + Create New Folder
          </button>
        </div>
      </Modal>

      {/* Create New Folder Modal */}
      <Modal
        isOpen={newFolderModalOpen}
        title="Create New Folder"
        description="Organise your list with custom folders like 'Watch Tonight' or 'With Family'."
        confirmText="Create"
        onConfirm={handleCreateFolder}
        onCancel={() => setNewFolderModalOpen(false)}
      >
        <div className={styles.modalContentGroup}>
          <input
            type="text"
            value={newFolderInput}
            onChange={e => setNewFolderInput(e.target.value)}
            placeholder="Folder Name (e.g. Anime, Movie Night)"
            className={styles.modalInput}
            onKeyDown={e => {
              if (e.key === 'Enter') handleCreateFolder()
            }}
            autoFocus
          />
        </div>
      </Modal>

      {/* Delete Folder Modal */}
      <Modal
        isOpen={!!folderToDelete}
        title="Delete Folder"
        description={`Are you sure you want to delete the folder "${folderToDelete}"? Items inside will remain on your wishlist.`}
        confirmText="Delete"
        onConfirm={confirmDeleteFolder}
        onCancel={() => setFolderToDelete(null)}
      />

      {/* Remove Item Modal */}
      <Modal
        isOpen={!!itemToRemove}
        title="Remove from Wishlist"
        description={`Are you sure you want to remove "${itemToRemove?.title}" from your list?`}
        confirmText="Remove"
        onConfirm={confirmRemove}
        onCancel={() => setItemToRemove(null)}
      />
    </div>
  )
}
