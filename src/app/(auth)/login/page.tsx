import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "./login-form";

/**
 * Login page.
 * @returns The rendered login card.
 */
export default function LoginPage(): React.JSX.Element {
  return (
    <Card className="py-6">
      <CardHeader>
        <CardTitle className="text-lg">Sign in</CardTitle>
        <CardDescription>
          Welcome back to Commitment Tracker.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <LoginForm />
        <p className="text-sm text-muted-foreground">
          No account?{" "}
          <Link href="/register" className="text-primary underline-offset-4 hover:underline">
            Create one
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
