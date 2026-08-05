import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbQuery } from "@/lib/db";
import { watchlist } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const rows = await dbQuery((db) =>
      db
        .select()
        .from(watchlist)
        .where(eq(watchlist.userId, userId))
        .orderBy(desc(watchlist.addedAt))
    );

    // Map to the local WishlistItem shape (see lib/wishlistTracker.ts)
    const formatted = rows.map(r => ({
      id: r.tmdbId,
      mediaType: r.mediaType,
      title: r.title,
      poster: r.poster_path,
      backdrop: r.backdrop_path,
      addedAt: r.addedAt,
      watchedAt: r.watchedAt ?? undefined,
      folderName: r.folderName ?? undefined,
      updatedAt: r.updatedAt,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Get watchlist error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
