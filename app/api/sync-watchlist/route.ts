import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbQuery } from "@/lib/db";
import { watchlist } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * "My List" sync — same latest-updatedAt-wins upsert pattern as /api/sync-progress,
 * keyed on (userId, tmdbId, mediaType) rather than a DB constraint (see lib/db/schema.ts).
 * Removals go through DELETE below rather than this POST, since a deleted item simply
 * isn't present in the next batch — there's nothing here to tell it apart from "never synced".
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

    // Deduplicate incoming batch by tmdbId+mediaType, keeping the latest updatedAt item
    const map = new Map<string, {
      tmdbId: string;
      mediaType: "movie" | "tv";
      title: string;
      poster_path: string | null;
      backdrop_path: string | null;
      addedAt: number;
      watchedAt: number | null;
      folderName: string | null;
      updatedAt: number;
    }>();

    for (const item of items) {
      if (!item || typeof item !== "object") continue;

      const tmdbId = item.id ? String(item.id).trim() : null;
      if (!tmdbId) continue;

      const mediaType: "movie" | "tv" = item.mediaType === "tv" ? "tv" : "movie";
      const title = typeof item.title === "string" && item.title.trim() ? item.title.trim() : "Untitled";
      const poster_path = item.poster ? String(item.poster) : null;
      const backdrop_path = item.backdrop ? String(item.backdrop) : null;
      const addedAt = typeof item.addedAt === "number" && !isNaN(item.addedAt) ? item.addedAt : Date.now();
      const watchedAt = typeof item.watchedAt === "number" && !isNaN(item.watchedAt) ? item.watchedAt : null;
      const folderName = typeof item.folderName === "string" && item.folderName.trim() ? item.folderName.trim() : null;
      const updatedAt = typeof item.updatedAt === "number" && !isNaN(item.updatedAt) ? item.updatedAt : addedAt;

      const key = `${mediaType}-${tmdbId}`;
      const existingEntry = map.get(key);
      if (!existingEntry || updatedAt >= existingEntry.updatedAt) {
        map.set(key, { tmdbId, mediaType, title, poster_path, backdrop_path, addedAt, watchedAt, folderName, updatedAt });
      }
    }

    const uniqueItems = Array.from(map.values());
    if (uniqueItems.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    await dbQuery(async (db) => {
      for (const item of uniqueItems) {
        const existing = await db
          .select()
          .from(watchlist)
          .where(
            and(
              eq(watchlist.userId, userId),
              eq(watchlist.tmdbId, item.tmdbId),
              eq(watchlist.mediaType, item.mediaType)
            )
          );

        if (existing.length > 0) {
          const latestExisting = existing.reduce((prev, curr) =>
            Number(curr.updatedAt || 0) > Number(prev.updatedAt || 0) ? curr : prev
          );
          const existingUpdatedAt = Number(latestExisting.updatedAt) || 0;

          if (item.updatedAt >= existingUpdatedAt) {
            await db
              .update(watchlist)
              .set({
                title: item.title,
                poster_path: item.poster_path ?? latestExisting.poster_path,
                backdrop_path: item.backdrop_path ?? latestExisting.backdrop_path,
                watchedAt: item.watchedAt,
                folderName: item.folderName,
                updatedAt: item.updatedAt,
              })
              .where(eq(watchlist.id, latestExisting.id));
          }
        } else {
          await db.insert(watchlist).values({
            userId,
            tmdbId: item.tmdbId,
            mediaType: item.mediaType,
            title: item.title,
            poster_path: item.poster_path,
            backdrop_path: item.backdrop_path,
            addedAt: item.addedAt,
            watchedAt: item.watchedAt,
            folderName: item.folderName,
            updatedAt: item.updatedAt,
          });
        }
      }
    });

    return NextResponse.json({ success: true, count: uniqueItems.length });
  } catch (error) {
    console.error("Sync watchlist error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const tmdbId = body?.tmdbId ? String(body.tmdbId).trim() : null;
    const mediaType = body?.mediaType === "tv" ? "tv" : "movie";

    if (!tmdbId) {
      return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
    }

    await dbQuery((db) =>
      db
        .delete(watchlist)
        .where(
          and(
            eq(watchlist.userId, userId),
            eq(watchlist.tmdbId, tmdbId),
            eq(watchlist.mediaType, mediaType)
          )
        )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete watchlist item error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
