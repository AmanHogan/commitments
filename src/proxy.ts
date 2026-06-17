import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Next.js 16 renamed Middleware to Proxy. This runs the edge-safe auth config
// to protect routes (see `authorized` callback in auth.config.ts).
export default NextAuth(authConfig).auth;

export const config = {
  // Run on everything except static assets and the auth API.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
