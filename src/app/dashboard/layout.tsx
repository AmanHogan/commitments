import type { ReactNode } from "react";
import { auth } from "@/lib/auth";
import { AppSidebar } from "@/components/app-sidebar";
import { SignOutButton } from "@/components/sign-out-button";

/**
 * Authenticated dashboard shell: sidebar + header + scrollable content.
 * @param props Contains the page content as `children`.
 * @returns The dashboard layout.
 */
export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}): Promise<React.JSX.Element> {
  const session = await auth();

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b px-4">
          <span className="text-sm font-medium text-muted-foreground">
            {session?.user?.name ?? "Commitment Tracker"}
          </span>
          <SignOutButton />
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
