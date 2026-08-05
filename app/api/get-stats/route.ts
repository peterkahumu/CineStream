import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbQuery } from "@/lib/db";
import { watchHistory, watchProgress } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const MONTH_MS = 30 * 24 * 60 * 60 * 1000;
const TOP_GENRES_LIMIT = 5;

interface GenreTally {
  id: number;
  name: string;
  count: number;
}

/** Flattens `genres` json across history rows and returns the top N by frequency. */
function tallyGenres(rows: { genres: unknown }[]): GenreTally[] {
  const counts = new Map<number, GenreTally>();

  for (const row of rows) {
    const genres = Array.isArray(row.genres) ? (row.genres as { id: number; name: string }[]) : [];
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
    let completedCount = 0;
    let thisWeek = 0;
    let thisMonth = 0;

    for (const row of historyRows) {
      const key = `${row.mediaType}-${row.tmdbId}`;
      titleKeys.add(key);
      if (row.mediaType === "movie") movieKeys.add(key);
      else tvKeys.add(key);

      if (row.event === "completed") completedCount += 1;
      if (now - row.occurredAt <= WEEK_MS) thisWeek += 1;
      if (now - row.occurredAt <= MONTH_MS) thisMonth += 1;
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
      completedCount,
      totalWatchSeconds,
      thisWeek,
      thisMonth,
      topGenres: tallyGenres(historyRows),
    });
  } catch (error) {
    console.error("Get stats error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
