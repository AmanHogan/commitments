"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/lib/models/user";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.email("Please enter a valid email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export interface RegisterResult {
  ok: boolean;
  error?: string;
}

/**
 * Register a new user account. Hashes the password and stores the user.
 * @param _prev Previous form state (unused; required by useActionState).
 * @param formData Submitted form data (name, email, password).
 * @returns A result indicating success or a human-readable error.
 */
export async function registerAction(
  _prev: RegisterResult | undefined,
  formData: FormData,
): Promise<RegisterResult> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await connectToDatabase();

  const existing = await User.findOne({ email: parsed.data.email });
  if (existing) {
    return { ok: false, error: "An account with that email already exists." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await User.create({
    name: parsed.data.name,
    email: parsed.data.email,
    passwordHash,
  });

  return { ok: true };
}
