import { auth } from "@/lib/auth";

/**
 * Resolve the authenticated user's id for use in Server Actions and pages.
 * Throws if there is no session — every data operation must be user-scoped.
 * @returns The current user's id as a string.
 */
export async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session.user.id;
}
