"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

const MAX_DISPLAY_NAME_LENGTH = 60;

export async function checkEmailExists(email: string) {
  if (!email) return false;
  
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return !!user;
}

export async function registerUser(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const existingUser = await checkEmailExists(email);
  if (existingUser) {
    return { error: "User already exists with that email." };
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    await db.insert(users).values({
      email,
      password: hashedPassword,
    });
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

  const trimmed = name.trim();
  if (!trimmed || trimmed.length > MAX_DISPLAY_NAME_LENGTH) {
    return { error: `Name must be between 1 and ${MAX_DISPLAY_NAME_LENGTH} characters.` };
  }

  try {
    await db.update(users).set({ name: trimmed }).where(eq(users.id, session.user.id));
    return { success: true, name: trimmed };
  } catch (error) {
    console.error("Update display name error:", error);
    return { error: "Failed to update display name." };
  }
}
