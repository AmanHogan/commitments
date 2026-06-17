"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  BookOpen,
  Lightbulb,
  Briefcase,
  Users,
  CheckSquare,
  Sparkles,
  FileText,
  Layers,
  Star,
  GraduationCap,
  BookMarked,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const SECTIONS: NavSection[] = [
  {
    title: "Dashboard",
    items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Business",
    items: [
      {
        label: "Business Partner Impact",
        href: "/dashboard/business-commitments",
        icon: ClipboardList,
      },
      {
        label: "TDP Program Impact",
        href: "/dashboard/business-commitments-two",
        icon: Briefcase,
      },
    ],
  },
  {
    title: "Development",
    items: [
      {
        label: "Development Commitment",
        href: "/dashboard/development-commitments-one",
        icon: BookOpen,
      },
      {
        label: "Innovation Commitment",
        href: "/dashboard/development-commitments-two",
        icon: Lightbulb,
      },
      { label: "Skills", href: "/dashboard/skills", icon: Sparkles },
      { label: "Resume", href: "/dashboard/resume", icon: FileText },
    ],
  },
  {
    title: "One on One",
    items: [
      { label: "One on One Documents", href: "/dashboard/one-on-one", icon: Users },
    ],
  },
  {
    title: "Reviews",
    items: [
      { label: "Progressions", href: "/dashboard/progressions", icon: TrendingUp },
    ],
  },
  {
    title: "Flashcards",
    items: [
      { label: "Sets", href: "/dashboard/flashcards", icon: Layers },
      { label: "Starred", href: "/dashboard/flashcards/starred", icon: Star },
      { label: "Skills", href: "/dashboard/flashcards/skills", icon: GraduationCap },
    ],
  },
  {
    title: "Other",
    items: [
      { label: "Action Items", href: "/dashboard/action-items", icon: CheckSquare },
      { label: "Docs / TDP Guide", href: "/dashboard/docs", icon: BookMarked },
    ],
  },
];

/**
 * Determine whether a nav href is the active route.
 * @param pathname The current pathname.
 * @param href The nav item href.
 * @returns True when the href matches the active route.
 */
function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Application sidebar with grouped navigation links.
 * @returns The rendered sidebar nav.
 */
export function AppSidebar(): React.JSX.Element {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="border-b px-4 py-4">
        <p className="text-sm font-semibold">Commitment Tracker</p>
        <p className="text-xs text-muted-foreground">Quick access to all sections</p>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {SECTIONS.map((section) => (
          <div key={section.title} className="mb-3">
            <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
              {section.title}
            </p>
            <ul className="flex flex-col gap-0.5">
              {section.items.map(({ label, href, icon: Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      isActive(pathname, href) &&
                        "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
