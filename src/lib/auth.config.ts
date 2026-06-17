import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe NextAuth configuration shared by the proxy (middleware) and the
 * full Node config. Contains NO database or Node-only code so it can run on the
 * edge runtime. The credentials provider is added in `auth.ts`.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    /**
     * Authorize route access for the proxy. Protects everything under
     * `/dashboard`; redirects authenticated users away from auth pages.
     * @param params NextAuth params with the resolved auth state and request.
     * @returns `true` to allow, `false` to redirect to sign-in, or a Response.
     */
    authorized({
      auth,
      request: { nextUrl },
    }: {
      auth: { user?: unknown } | null;
      request: { nextUrl: URL };
    }): boolean | Response {
      const isLoggedIn = Boolean(auth?.user);
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");
      const isOnAuthPage =
        nextUrl.pathname === "/login" || nextUrl.pathname === "/register";

      if (isOnDashboard) {
        return isLoggedIn;
      }
      if (isOnAuthPage && isLoggedIn) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
