"use server";

import { auth } from "@/auth";
import { dbQuery } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

const MAX_DISPLAY_NAME_LENGTH = 60;
const MIN_PASSWORD_LENGTH = 6;
// Loose sanity check, not full RFC 5322 — just enough to reject obvious garbage.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function checkEmailExists(email: string) {
  if (!email) return false;

  const [user] = await dbQuery((db) =>
    db.select().from(users).where(eq(users.email, email)).limit(1)
  );
  return !!user;
}

export async function registerUser(formData: FormData) {
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  // The client form enforces these too (type="email", minLength={6}), but that's
  // trivially bypassed by calling this server action directly — this is the real gate.
  if (!EMAIL_RE.test(email)) {
    return { error: "Please enter a valid email address." };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
  }

  let existingUser = false;
  try {
    existingUser = await checkEmailExists(email);
  } catch {
    return { error: "Database error checking email. Please try again." };
  }

  if (existingUser) {
    return { error: "User already exists with that email." };
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    await dbQuery((db) =>
      db.insert(users).values({
        email,
        password: hashedPassword,
      })
    );
    return { success: true };
  } catch (error) {
    console.error("Registration error:", error);
    return { error: "Failed to register user." };
  }
}

export async function updateDisplayName(name: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized." };
  }

  const userId = session.user.id;

  const trimmed = name.trim();
  if (!trimmed || trimmed.length > MAX_DISPLAY_NAME_LENGTH) {
    return { error: `Name must be between 1 and ${MAX_DISPLAY_NAME_LENGTH} characters.` };
  }

  try {
    await dbQuery((db) =>
      db.update(users).set({ name: trimmed }).where(eq(users.id, userId))
    );
    return { success: true, name: trimmed };
  } catch (error) {
    console.error("Update display name error:", error);
    return { error: "Failed to update display name." };
  }
}
