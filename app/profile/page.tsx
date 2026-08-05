import { auth, signOut } from "@/auth"
import { redirect } from "next/navigation"
import { eq } from "drizzle-orm"
import { db, dbQuery } from "@/lib/db"
import { users } from "@/lib/db/schema"
import type { Metadata } from "next"
import ProfileClient from "./ProfileClient"
import buttonStyles from "./Profile.module.css"

export const metadata: Metadata = {
  title: "Profile",
  description: "Your CinemaPhora account — continue watching, watch history, and stats.",
}

export default async function ProfilePage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/login")
  }

  const userId = session.user.id

  // Read fresh from the DB rather than trusting the JWT, so a just-edited display
  // name is always reflected without needing to force a session/token refresh.
  // dbQuery handles transient Neon connection failures automatically.
  let user: { name: string | null; email: string | null; createdAt: Date | null } | undefined
  try {
    const [dbUser] = await dbQuery(() =>
      db
        .select({ name: users.name, email: users.email, createdAt: users.createdAt })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)
    )
    user = dbUser
  } catch (error) {
    console.warn("ProfilePage: failed to query user from DB, falling back to session:", error)
  }

  return (
    <div className="page-content page-container">
      <ProfileClient
        name={user?.name ?? session.user.name ?? null}
        email={user?.email ?? session.user.email ?? ""}
        memberSince={user?.createdAt?.toISOString() ?? null}
      >
        <form
          action={async () => {
            "use server"
            await signOut()
          }}
        >
          <button type="submit" className={buttonStyles.signOutBtn}>
            Sign Out
          </button>
        </form>
      </ProfileClient>
    </div>
  )
}
