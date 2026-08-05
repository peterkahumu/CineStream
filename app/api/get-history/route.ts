import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { watchHistory } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rows = await db
      .select()
      .from(watchHistory)
      .where(eq(watchHistory.userId, session.user.id))
      .orderBy(desc(watchHistory.occurredAt));

    // Map to the local HistoryEvent shape (see lib/progressTracker.ts)
    const formatted = rows.map(r => ({
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
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Get history error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
