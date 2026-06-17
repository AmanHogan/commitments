"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

/**
 * Client providers wrapper (NextAuth session context).
 * @param props Contains the app tree as `children`.
 * @returns The children wrapped in client-side providers.
 */
export function Providers({ children }: { children: ReactNode }): React.JSX.Element {
  return <SessionProvider>{children}</SessionProvider>;
}
