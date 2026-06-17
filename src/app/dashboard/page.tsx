import Link from "next/link";
import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SHORTCUTS: { label: string; href: string; description: string }[] = [
  {
    label: "Skills",
    href: "/dashboard/skills",
    description: "Track skills and proficiency.",
  },
  {
    label: "Action Items",
    href: "/dashboard/action-items",
    description: "Tasks with due dates and reminders.",
  },
  {
    label: "Business Partner Impact",
    href: "/dashboard/business-commitments",
    description: "Document business commitments.",
  },
];

/**
 * Dashboard landing page with a greeting and quick links.
 * @returns The rendered dashboard home.
 */
export default async function DashboardHome(): Promise<React.JSX.Element> {
  const session = await auth();

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-1 text-2xl font-semibold">
        Welcome{session?.user?.name ? `, ${session.user.name}` : ""}
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Pick up where you left off.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SHORTCUTS.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="h-full transition-colors hover:bg-accent">
              <CardHeader>
                <CardTitle>{item.label}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {item.description}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
