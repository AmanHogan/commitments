import NextAuth, { type NextAuthResult } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authConfig } from "@/lib/auth.config";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/lib/models/user";

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

const result: NextAuthResult = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      /**
       * Validate credentials against the User collection.
       * @param credentials Raw credentials submitted from the login form.
       * @returns The authenticated user (id, name, email) or null on failure.
       */
      async authorize(
        credentials: Partial<Record<"email" | "password", unknown>>,
      ): Promise<{ id: string; name: string; email: string } | null> {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }
        await connectToDatabase();
        const user = await User.findOne({ email: parsed.data.email });
        if (!user) {
          return null;
        }
        const valid = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash,
        );
        if (!valid) {
          return null;
        }
        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    /**
     * Persist the user id onto the JWT at sign-in.
     * @param params The token and (on sign-in) the user.
     * @returns The augmented token.
     */
    jwt({ token, user }): typeof token {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    /**
     * Expose the user id on the session object.
     * @param params The session and token.
     * @returns The augmented session.
     */
    session({ session, token }): typeof session {
      if (session.user && typeof token.id === "string") {
        session.user.id = token.id;
      }
      return session;
    },
  },
});

export const handlers = result.handlers;
export const auth = result.auth;
export const signIn = result.signIn;
export const signOut = result.signOut;
