"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Button that signs the current user out and returns to the login page.
 * @returns The rendered sign-out button.
 */
export function SignOutButton(): React.JSX.Element {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => {
        void signOut({ callbackUrl: "/login" });
      }}
    >
      <LogOut className="h-4 w-4" />
      Sign out
    </Button>
  );
}
