import toast from "react-hot-toast";
import {
  getAllProgress,
  mergeRemoteProgress,
  getAllHistoryEvents,
  mergeRemoteHistory,
} from "@/lib/progressTracker";
import { getWishlist, mergeRemoteWishlist } from "@/lib/wishlistTracker";

/**
 * Reconciles localStorage with the DB right after a successful login/registration:
 * 1. Pull the user's progress + history + wishlist from the DB and merge into localStorage.
 * 2. Push any local-only items (e.g. things watched/saved as a guest before signing in)
 *    back up to the DB.
 *
 * Shared by LoginClient and RegisterClient so both entry points behave the same way.
 */
export async function syncOnLogin(): Promise<void> {
  try {
    const [progressRes, historyRes, watchlistRes] = await Promise.all([
      fetch("/api/get-progress"),
      fetch("/api/get-history"),
      fetch("/api/get-watchlist"),
    ]);

    let hasRemoteData = false;

    if (progressRes.ok) {
      const dbProgress = await progressRes.json();
      if (Array.isArray(dbProgress) && dbProgress.length > 0) {
        mergeRemoteProgress(dbProgress);
        hasRemoteData = true;
      }
    }

    if (historyRes.ok) {
      const dbHistory = await historyRes.json();
      if (Array.isArray(dbHistory) && dbHistory.length > 0) {
        mergeRemoteHistory(dbHistory);
        hasRemoteData = true;
      }
    }

    if (watchlistRes.ok) {
      const dbWatchlist = await watchlistRes.json();
      if (Array.isArray(dbWatchlist) && dbWatchlist.length > 0) {
        mergeRemoteWishlist(dbWatchlist);
        hasRemoteData = true;
      }
    }

    if (hasRemoteData) {
      toast.success("Watch history synced across devices!");
    }

    const localProgress = getAllProgress();
    const localHistory = getAllHistoryEvents();
    const localWishlist = getWishlist();

    await Promise.all([
      localProgress.length > 0
        ? fetch("/api/sync-progress", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(localProgress),
          })
        : Promise.resolve(),
      localHistory.length > 0
        ? fetch("/api/sync-history", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(localHistory),
          })
        : Promise.resolve(),
      localWishlist.length > 0
        ? fetch("/api/sync-watchlist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(localWishlist),
          })
        : Promise.resolve(),
    ]);
  } catch (err) {
    console.error("[authSync] Sync on login failed:", err);
  }
}
