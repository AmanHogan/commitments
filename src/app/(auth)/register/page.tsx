import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RegisterForm } from "./register-form";

/**
 * Account creation page.
 * @returns The rendered register card.
 */
export default function RegisterPage(): React.JSX.Element {
  return (
    <Card className="py-6">
      <CardHeader>
        <CardTitle className="text-lg">Create account</CardTitle>
        <CardDescription>Start tracking your commitments.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <RegisterForm />
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
