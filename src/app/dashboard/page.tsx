import Link from "next/link";
import {
  Sparkles,
  CheckSquare,
  ClipboardList,
  Briefcase,
  BookOpen,
  Lightbulb,
  TrendingUp,
  Users,
  Layers,
  FileText,
  BookMarked,
  type LucideIcon,
} from "lucide-react";
import { auth } from "@/lib/auth";

interface Shortcut {
  label: string;
  href: string;
  description: string;
  icon: LucideIcon;
}

interface ShortcutGroup {
  title: string;
  items: Shortcut[];
}

const GROUPS: ShortcutGroup[] = [
  {
    title: "Commitments",
    items: [
      {
        label: "Business Partner Impact",
        href: "/dashboard/business-commitments",
        description: "Section 1 — measurable business impact from your BP work, in STAR form.",
        icon: ClipboardList,
      },
      {
        label: "TDP Program Impact",
        href: "/dashboard/business-commitments-two",
        description: "Section 2 — leadership and program contributions beyond your BP assignment.",
        icon: Briefcase,
      },
      {
        label: "Development Commitment",
        href: "/dashboard/development-commitments-one",
        description: "Section 3 — learning items and modules with hours and completion tracking.",
        icon: BookOpen,
      },
      {
        label: "Innovation Commitment",
        href: "/dashboard/development-commitments-two",
        description: "Hackathons, challenges, and creative initiatives with sub-events.",
        icon: Lightbulb,
      },
    ],
  },
  {
    title: "Reviews & Growth",
    items: [
      {
        label: "Progressions",
        href: "/dashboard/progressions",
        description: "Curate your strongest work into a STAR-formatted progression submission.",
        icon: TrendingUp,
      },
      {
        label: "One on One",
        href: "/dashboard/one-on-one",
        description: "Running 1:1 documents with import from your commitments and skills.",
        icon: Users,
      },
      {
        label: "Skills",
        href: "/dashboard/skills",
        description: "Track skills and proficiency with rings, tags, and distribution charts.",
        icon: Sparkles,
      },
      {
        label: "Resume",
        href: "/dashboard/resume",
        description: "Upload, label, and preview your resume PDF versions.",
        icon: FileText,
      },
    ],
  },
  {
    title: "Tools",
    items: [
      {
        label: "Action Items",
        href: "/dashboard/action-items",
        description: "Tasks with criticality, due dates, and overdue indicators.",
        icon: CheckSquare,
      },
      {
        label: "Flashcards",
        href: "/dashboard/flashcards",
        description: "Study sets with starred cards and linked skills.",
        icon: Layers,
      },
      {
        label: "Docs / TDP Guide",
        href: "/dashboard/docs",
        description: "The complete TDP midyear & progression writing guide.",
        icon: BookMarked,
      },
    ],
  },
];

/**
 * A single dashboard shortcut card that lifts and reveals its description on hover.
 * @param props The shortcut to render.
 * @returns The rendered card link.
 */
function ShortcutCard({ item }: { item: Shortcut }): React.JSX.Element {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className="group relative flex flex-col gap-3 overflow-hidden rounded-xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary hover:shadow-lg hover:shadow-primary/10"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
          <Icon className="h-5 w-5" />
        </span>
        <h3 className="font-medium leading-tight">{item.label}</h3>
      </div>
      <p className="max-h-0 overflow-hidden text-sm leading-snug text-muted-foreground opacity-0 transition-all duration-300 group-hover:max-h-24 group-hover:opacity-100">
        {item.description}
      </p>
    </Link>
  );
}

/**
 * Dashboard landing page: a greeting plus grouped, hover-expanding shortcut
 * cards linking to every section of the app.
 * @returns The rendered dashboard home.
 */
export default async function DashboardHome(): Promise<React.JSX.Element> {
  const session = await auth();

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-1 text-2xl font-semibold">
        Welcome{session?.user?.name ? `, ${session.user.name}` : ""}
      </h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Pick up where you left off — hover any card for details.
      </p>

      <div className="flex flex-col gap-8">
        {GROUPS.map((group) => (
          <section key={group.title}>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {group.title}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map((item) => (
                <ShortcutCard key={item.href} item={item} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
