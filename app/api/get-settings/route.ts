import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db, dbQuery } from "@/lib/db";
import { userSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const [row] = await dbQuery(() =>
      db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, userId))
        .limit(1)
    );

    if (!row) return NextResponse.json(null);

    return NextResponse.json({ settings: row.settings, updatedAt: row.updatedAt });
  } catch (error) {
    console.error("Get settings error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
