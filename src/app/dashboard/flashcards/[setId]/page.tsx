import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getFlashCardSet } from "../actions";
import { SetDetailClient } from "./set-detail-client";

interface Props {
  params: Promise<{ setId: string }>;
}

/**
 * Flash card set detail page: shows all cards and launches study mode.
 * @param props Route params containing setId.
 * @returns The rendered page.
 */
export default async function SetDetailPage({
  params,
}: Props): Promise<React.JSX.Element> {
  const { setId } = await params;
  const set = await getFlashCardSet(setId);
  if (!set) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/dashboard/flashcards"
        className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        All sets
      </Link>
      <h1 className="mb-1 text-2xl font-semibold">{set.title}</h1>
      {set.description ? (
        <p className="mb-1 text-sm text-muted-foreground">{set.description}</p>
      ) : null}
      <p className="mb-6 text-xs text-muted-foreground">
        {set.cardCount} card{set.cardCount !== 1 ? "s" : ""}
        {set.timesStudied > 0 ? ` · studied ${set.timesStudied}×` : ""}
        {set.topic ? ` · ${set.topic}` : ""}
      </p>
      <SetDetailClient initialSet={set} />
    </div>
  );
}
