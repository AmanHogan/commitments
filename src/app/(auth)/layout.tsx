import type { ReactNode } from "react";

/**
 * Centered layout for the login and register pages.
 * @param props Contains the page content as `children`.
 * @returns The auth shell wrapping the page.
 */
export default function AuthLayout({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
