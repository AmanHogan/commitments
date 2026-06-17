"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerAction } from "../actions";

/**
 * Client registration form. Creates the account via a Server Action, then signs
 * the user in and redirects to the dashboard.
 * @returns The rendered registration form.
 */
export function RegisterForm(): React.JSX.Element {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  /**
   * Handle submission: register, then sign in on success.
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
      const result = await registerAction(undefined, formData);
      if (!result.ok) {
        setError(result.error ?? "Could not create account.");
        return;
      }
      const signInResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (!signInResult || signInResult.error) {
        // Account created but auto sign-in failed — send to login.
        router.push("/login");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" type="text" autoComplete="name" required />
      </div>
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
          autoComplete="new-password"
          required
          minLength={8}
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={isPending} className="mt-1">
        {isPending ? "Creating…" : "Create account"}
      </Button>
    </form>
  );
}
