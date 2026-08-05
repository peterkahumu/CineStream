import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db, dbQuery } from "@/lib/db";
import { watchProgress } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

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
      // Upsert logic for each progress item
      // We will check if it exists for this user + tmdbId
      const existing = await dbQuery(() =>
        db
          .select()
          .from(watchProgress)
          .where(
            and(
              eq(watchProgress.userId, userId),
              eq(watchProgress.tmdbId, item.id)
            )
          )
          .limit(1)
      );

      if (existing.length > 0) {
        // If the incoming timestamp is newer, update it
        if (item.updatedAt > existing[0].updatedAt) {
          await dbQuery(() =>
            db
              .update(watchProgress)
              .set({
                watched: item.watched,
                duration: item.duration,
                season: item.season,
                episode: item.episode,
                show_progress: item.show_progress,
                genres: item.genres,
                lastProvider: item.lastProvider,
                updatedAt: item.updatedAt,
              })
              .where(eq(watchProgress.id, existing[0].id))
          );
        }
      } else {
        // Insert new
        await dbQuery(() =>
          db.insert(watchProgress).values({
            userId,
            tmdbId: item.id,
            mediaType: item.mediaType,
            title: item.title,
            poster_path: item.poster_path,
            backdrop_path: item.backdrop_path,
            watched: item.watched,
            duration: item.duration,
            season: item.season,
            episode: item.episode,
            show_progress: item.show_progress,
            genres: item.genres,
            lastProvider: item.lastProvider,
            updatedAt: item.updatedAt,
          })
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Sync progress error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
