import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbQuery } from "@/lib/db";
import { watchHistory, watchProgress } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const MONTH_MS = 30 * DAY_MS;
const TOP_GENRES_LIMIT = 5;
const ACTIVITY_DAYS = 7;

interface GenreTally {
  id: number;
  name: string;
  count: number;
}

interface HistoryRow {
  mediaType: string;
  tmdbId: string;
  event: string;
  genres: unknown;
  occurredAt: number;
}

/**
 * Tallies genres once per distinct title, not once per history row — a show
 * watched across many episodes would otherwise dominate a movie watched once,
 * since each episode is its own row (see lib/db/schema.ts watchHistory).
 */
function tallyGenres(rows: HistoryRow[]): GenreTally[] {
  const genresByTitle = new Map<string, { id: number; name: string }[]>();
  for (const row of rows) {
    const titleKey = `${row.mediaType}-${row.tmdbId}`;
    if (genresByTitle.has(titleKey)) continue;
    genresByTitle.set(titleKey, Array.isArray(row.genres) ? (row.genres as { id: number; name: string }[]) : []);
  }

  const counts = new Map<number, GenreTally>();
  for (const genres of genresByTitle.values()) {
    for (const genre of genres) {
      if (!genre || typeof genre.id !== "number" || !genre.name) continue;
      const existing = counts.get(genre.id);
      if (existing) existing.count += 1;
      else counts.set(genre.id, { id: genre.id, name: genre.name, count: 1 });
    }
  }

  return Array.from(counts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, TOP_GENRES_LIMIT);
}

/** Distinct titles touched per day over the last ACTIVITY_DAYS days, oldest first. */
function buildActivity(rows: HistoryRow[], now: number): { date: string; count: number }[] {
  const byDay = new Map<string, Set<string>>();
  for (let i = ACTIVITY_DAYS - 1; i >= 0; i--) {
    byDay.set(new Date(now - i * DAY_MS).toISOString().slice(0, 10), new Set());
  }

  for (const row of rows) {
    const dateStr = new Date(row.occurredAt).toISOString().slice(0, 10);
    byDay.get(dateStr)?.add(`${row.mediaType}-${row.tmdbId}`);
  }

  return Array.from(byDay.entries()).map(([date, titles]) => ({ date, count: titles.size }));
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const [historyRows, progressRows] = await dbQuery((db) =>
      Promise.all([
        db.select().from(watchHistory).where(eq(watchHistory.userId, userId)),
        db.select().from(watchProgress).where(eq(watchProgress.userId, userId)),
      ])
    );

    const now = Date.now();
    const titleKeys = new Set<string>();
    const movieKeys = new Set<string>();
    const tvKeys = new Set<string>();
    const titlesCompleted = new Set<string>();
    // Distinct titles, not raw event rows — a title can log several started/completed
    // events (resumes, rewatches), so counting rows reads as a meaningless number.
    const titlesThisWeek = new Set<string>();
    const titlesThisMonth = new Set<string>();

    for (const row of historyRows) {
      const key = `${row.mediaType}-${row.tmdbId}`;
      titleKeys.add(key);
      if (row.mediaType === "movie") movieKeys.add(key);
      else tvKeys.add(key);

      if (row.event === "completed") titlesCompleted.add(key);
      if (now - row.occurredAt <= WEEK_MS) titlesThisWeek.add(key);
      if (now - row.occurredAt <= MONTH_MS) titlesThisMonth.add(key);
    }

    // Total watch time comes from watch_progress (the authoritative per-item position),
    // capped at each item's duration so a stray over-report can't inflate the total.
    const totalWatchSeconds = progressRows.reduce((sum, row) => {
      const watched = row.watched ?? 0;
      const duration = row.duration ?? 0;
      return sum + (duration > 0 ? Math.min(watched, duration) : watched);
    }, 0);

    return NextResponse.json({
      titlesWatched: titleKeys.size,
      moviesWatched: movieKeys.size,
      tvShowsWatched: tvKeys.size,
      completionRate: titleKeys.size > 0 ? Math.round((titlesCompleted.size / titleKeys.size) * 100) : 0,
      totalWatchSeconds,
      thisWeek: titlesThisWeek.size,
      thisMonth: titlesThisMonth.size,
      topGenres: tallyGenres(historyRows),
      activity: buildActivity(historyRows, now),
    });
  } catch (error) {
    console.error("Get stats error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
