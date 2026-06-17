"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Client login form. Authenticates via the NextAuth credentials provider and
 * redirects to the dashboard on success.
 * @returns The rendered login form.
 */
export function LoginForm(): React.JSX.Element {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  /**
   * Handle form submission by calling signIn and routing on success.
   * @param event The form submit event.
   * @returns Nothing.
   */
  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    startTransition(async () => {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (!result || result.error) {
        setError("Invalid email or password.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={isPending} className="mt-1">
        {isPending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
