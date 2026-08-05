import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbQuery } from "@/lib/db";
import { watchHistory, watchProgress } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const MONTH_MS = 30 * DAY_MS;
const THREE_MONTHS_MS = 90 * DAY_MS;
const TOP_GENRES_LIMIT = 8;
const MAX_ACTIVITY_DAYS = 90;

export interface GenreTally {
  id: number;
  name: string;
  count: number;
}

export interface ActivityPoint {
  date: string;
  count: number;
  movies: number;
  tvShows: number;
}

interface HistoryRow {
  mediaType: string;
  tmdbId: string;
  event: string;
  genres: unknown;
  occurredAt: number;
}

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

function buildActivitySeries(rows: HistoryRow[], now: number, daysCount = MAX_ACTIVITY_DAYS): ActivityPoint[] {
  const byDay = new Map<string, { movies: Set<string>; tv: Set<string> }>();
  for (let i = daysCount - 1; i >= 0; i--) {
    const dateStr = new Date(now - i * DAY_MS).toISOString().slice(0, 10);
    byDay.set(dateStr, { movies: new Set(), tv: new Set() });
  }

  for (const row of rows) {
    const dateStr = new Date(row.occurredAt).toISOString().slice(0, 10);
    const dayEntry = byDay.get(dateStr);
    if (dayEntry) {
      if (row.mediaType === "movie") {
        dayEntry.movies.add(row.tmdbId);
      } else {
        dayEntry.tv.add(row.tmdbId);
      }
    }
  }

  return Array.from(byDay.entries()).map(([date, sets]) => ({
    date,
    count: sets.movies.size + sets.tv.size,
    movies: sets.movies.size,
    tvShows: sets.tv.size,
  }));
}

function calculateStreak(activitySeries: ActivityPoint[]): number {
  let streak = 0;
  for (let i = activitySeries.length - 1; i >= 0; i--) {
    if (activitySeries[i].count > 0) {
      streak++;
    } else if (i === activitySeries.length - 1) {
      continue;
    } else {
      break;
    }
  }
  return streak;
}

function calculatePeakDay(rows: HistoryRow[]): { day: string; count: number } {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const counts = [0, 0, 0, 0, 0, 0, 0];

  for (const row of rows) {
    const d = new Date(row.occurredAt);
    counts[d.getDay()]++;
  }

  let maxIdx = 0;
  for (let i = 1; i < 7; i++) {
    if (counts[i] > counts[maxIdx]) maxIdx = i;
  }

  return { day: days[maxIdx], count: counts[maxIdx] };
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
    const currentMonthStr = new Date(now).toISOString().slice(0, 7);

    const titleKeys = new Set<string>();
    const movieKeys = new Set<string>();
    const tvKeys = new Set<string>();
    const titlesCompleted = new Set<string>();
    const titlesThisWeek = new Set<string>();
    const titlesThisMonth = new Set<string>();

    const rows7d: HistoryRow[] = [];
    const rows30d: HistoryRow[] = [];
    const rowsMtd: HistoryRow[] = [];
    const rows90d: HistoryRow[] = [];

    for (const row of historyRows) {
      const key = `${row.mediaType}-${row.tmdbId}`;
      titleKeys.add(key);
      if (row.mediaType === "movie") movieKeys.add(key);
      else tvKeys.add(key);

      if (row.event === "completed") titlesCompleted.add(key);
      if (now - row.occurredAt <= WEEK_MS) {
        titlesThisWeek.add(key);
        rows7d.push(row);
      }
      if (now - row.occurredAt <= MONTH_MS) {
        titlesThisMonth.add(key);
        rows30d.push(row);
      }
      if (new Date(row.occurredAt).toISOString().slice(0, 7) === currentMonthStr) {
        rowsMtd.push(row);
      }
      if (now - row.occurredAt <= THREE_MONTHS_MS) {
        rows90d.push(row);
      }
    }

    let movieWatchSeconds = 0;
    let tvWatchSeconds = 0;

    const totalWatchSeconds = progressRows.reduce((sum, row) => {
      const watched = row.watched ?? 0;
      const duration = row.duration ?? 0;
      const validSeconds = duration > 0 ? Math.min(watched, duration) : watched;
      if (row.mediaType === "movie") movieWatchSeconds += validSeconds;
      else tvWatchSeconds += validSeconds;
      return sum + validSeconds;
    }, 0);

    const activitySeries = buildActivitySeries(historyRows, now, MAX_ACTIVITY_DAYS);
    const activeStreak = calculateStreak(activitySeries);
    const peakDay = calculatePeakDay(historyRows);

    const genresByRange = {
      "7d": tallyGenres(rows7d),
      "30d": tallyGenres(rows30d),
      mtd: tallyGenres(rowsMtd),
      "90d": tallyGenres(rows90d),
      all: tallyGenres(historyRows),
    };

    return NextResponse.json({
      titlesWatched: titleKeys.size,
      titlesCompleted: titlesCompleted.size,
      moviesWatched: movieKeys.size,
      tvShowsWatched: tvKeys.size,
      completionRate: titleKeys.size > 0 ? Math.round((titlesCompleted.size / titleKeys.size) * 100) : 0,
      totalWatchSeconds,
      movieWatchSeconds,
      tvWatchSeconds,
      thisWeek: titlesThisWeek.size,
      thisMonth: titlesThisMonth.size,
      totalWatchEvents: historyRows.length,
      activeStreak,
      peakDay,
      topGenres: genresByRange["all"],
      genresByRange,
      activity: activitySeries.slice(-7),
      activitySeries,
    });
  } catch (error) {
    console.error("Get stats error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
