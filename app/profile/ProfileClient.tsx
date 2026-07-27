"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "./Profile.module.css";
import SettingsClient from "@/app/settings/SettingsClient";

interface HistoryItem {
  id: string;
  mediaType: "movie" | "tv";
  title: string;
  poster_path: string | null;
  season?: number;
  episode?: number;
  watched: number;
  duration: number;
  updatedAt: number;
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatProgress(watched: number, duration: number): string {
  if (!duration) return "";
  const pct = Math.round((watched / duration) * 100);
  return `${pct}%`;
}

async function loadHistory(
  setHistory: (items: HistoryItem[]) => void,
  setLoading: (v: boolean) => void
) {
  try {
    const res = await fetch("/api/get-progress");
    if (!res.ok) throw new Error("Failed to load history");
    const data = await res.json();
    if (Array.isArray(data)) {
      setHistory(data as HistoryItem[]);
    }
  } catch (err) {
    console.error("[ProfileClient] Failed to load history:", err);
  } finally {
    setLoading(false);
  }
}

export default function ProfileClient() {
  const [activeTab, setActiveTab] = useState<"history" | "settings">("history");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory(setHistory, setLoading);
  }, []);

  return (
    <div className={styles.clientContainer}>
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === "history" ? styles.activeTab : ""}`}
          onClick={() => setActiveTab("history")}
        >
          Watch History
        </button>
        <button
          className={`${styles.tab} ${activeTab === "settings" ? styles.activeTab : ""}`}
          onClick={() => setActiveTab("settings")}
        >
          Settings
        </button>
      </div>

      <div className={styles.tabContent}>
        {activeTab === "history" && (
          <div>
            <h2 className={styles.sectionTitle}>Watch History</h2>
            <p className={styles.sectionSubtitle}>
              All movies and episodes you&apos;ve watched, synced across your devices.
            </p>
            {loading ? (
              <p className={styles.loadingState}>Loading history...</p>
            ) : history.length === 0 ? (
              <p className={styles.emptyState}>
                No watch history yet.{" "}
                <Link href="/" className={styles.emptyLink}>Start watching something!</Link>
              </p>
            ) : (
              <div className={styles.historyGrid}>
                {history.map((item) => (
                  <Link
                    key={`${item.id}-${item.season ?? ""}-${item.episode ?? ""}`}
                    href={`/details/${item.mediaType}-${item.id}`}
                    className={styles.historyCard}
                  >
                    <div className={styles.historyPoster}>
                      {item.poster_path ? (
                        <Image
                          src={`https://image.tmdb.org/t/p/w185${item.poster_path}`}
                          alt={item.title}
                          fill
                          sizes="(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 15vw"
                          className={styles.historyPosterImg}
                        />
                      ) : (
                        <div className={styles.historyPosterFallback}>
                          <span>{item.title.charAt(0)}</span>
                        </div>
                      )}
                      <span className={styles.historyBadge}>
                        {item.mediaType === "movie" ? "Movie" : "TV"}
                      </span>
                      {item.duration > 0 && (
                        <div className={styles.historyProgressBar}>
                          <div
                            className={styles.historyProgressFill}
                            style={{ width: `${Math.min(100, Math.round((item.watched / item.duration) * 100))}%` }}
                          />
                        </div>
                      )}
                    </div>
                    <div className={styles.historyInfo}>
                      <p className={styles.historyTitle}>{item.title}</p>
                      {item.mediaType === "tv" && item.season != null && item.episode != null && (
                        <p className={styles.historyEpisode}>
                          S{item.season} E{item.episode}
                        </p>
                      )}
                      <p className={styles.historyMeta}>
                        <span className={styles.historyDate}>{formatDate(item.updatedAt)}</span>
                        {item.duration > 0 && (
                          <span className={styles.historyProgress}>
                            {formatProgress(item.watched, item.duration)}
                          </span>
                        )}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "settings" && (
          <SettingsClient />
        )}
      </div>
    </div>
  );
}
