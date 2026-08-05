import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db, dbQuery } from "@/lib/db";
import { watchHistory } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Watch history events are immutable once created (see lib/progressTracker.ts), so
 * syncing is a simple idempotent insert keyed on the client-generated `id` — unlike
 * /api/sync-progress there is no "newer wins" comparison to make.
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const items = await request.json();

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
    }

    for (const item of items) {
      if (!item?.id) continue;

      const existing = await dbQuery(() =>
        db
          .select({ id: watchHistory.id })
          .from(watchHistory)
          .where(and(eq(watchHistory.id, item.id), eq(watchHistory.userId, userId)))
          .limit(1)
      );

      if (existing.length > 0) continue;

      await dbQuery(() =>
        db.insert(watchHistory).values({
          id: item.id,
          userId,
          tmdbId: item.tmdbId,
          mediaType: item.mediaType,
          title: item.title,
          poster_path: item.poster_path,
          season: item.season,
          episode: item.episode,
          event: item.event,
          genres: item.genres,
          occurredAt: item.occurredAt,
        })
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Sync history error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
