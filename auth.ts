import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { db } from "./lib/db"
import { eq } from "drizzle-orm"
import { users } from "./lib/db/schema"
import bcrypt from "bcryptjs"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) return null
        
        const email = credentials.email as string;
        const password = credentials.password as string;

        let user;
        try {
          const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
          user = result[0];
        } catch (dbErr) {
          console.error("DB Error in authorize:", dbErr);
          throw new Error("Database error during authorization.");
        }

        if (!user || !user.password) {
          throw new Error("Invalid credentials.")
        }

        const isMatch = await bcrypt.compare(password, user.password)
        
        if (!isMatch) {
          throw new Error("Invalid credentials.")
        }

        return user
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async session({ session, token }) {
      if (token?.sub) {
        session.user.id = token.sub
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id
      }
      return token
    }
  },
})
