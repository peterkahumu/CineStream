import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbQuery } from "@/lib/db";
import { watchHistory } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

// Map a DB row to the local HistoryEvent shape (see lib/progressTracker.ts)
function formatRow(r: typeof watchHistory.$inferSelect) {
  return {
    id: r.id,
    tmdbId: r.tmdbId,
    mediaType: r.mediaType,
    title: r.title,
    poster_path: r.poster_path,
    season: r.season,
    episode: r.episode,
    event: r.event,
    genres: r.genres,
    occurredAt: r.occurredAt,
  };
}

/**
 * Watch history events are append-only (see lib/progressTracker.ts) — the same
 * episode can legitimately gain several "started"/"completed" rows over time
 * (resumes, rewatches). Called with no query params, this returns the raw
 * per-event list, which authSync.ts needs in full to reconcile localStorage on
 * login. Called with a `page` param, it instead collapses repeat events for the
 * same title/episode down to the latest one and paginates the result — what the
 * Profile page's Watch History list displays.
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const rows = await dbQuery((db) =>
      db
        .select()
        .from(watchHistory)
        .where(eq(watchHistory.userId, userId))
        .orderBy(desc(watchHistory.occurredAt))
    );

    const { searchParams } = new URL(request.url);
    if (!searchParams.has("page")) {
      return NextResponse.json(rows.map(formatRow));
    }

    const type = searchParams.get("type");
    const mediaFilter = type === "movie" || type === "tv" ? type : null;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(searchParams.get("pageSize") ?? "", 10) || DEFAULT_PAGE_SIZE)
    );

    const filtered = mediaFilter ? rows.filter(r => r.mediaType === mediaFilter) : rows;

    // `filtered` is already sorted newest-first, so the first row seen per
    // title/episode key is the most recent event for it — keep only that one.
    const seen = new Set<string>();
    const deduped: typeof filtered = [];
    for (const row of filtered) {
      const key = `${row.mediaType}-${row.tmdbId}-${row.season ?? ""}-${row.episode ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(row);
    }

    const start = (page - 1) * pageSize;
    const items = deduped.slice(start, start + pageSize).map(formatRow);

    return NextResponse.json({ items, total: deduped.length, page, pageSize });
  } catch (error) {
    console.error("Get history error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
