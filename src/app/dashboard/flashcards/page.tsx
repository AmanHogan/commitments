import { getFlashCardSets } from "./actions";
import { FlashcardsClient } from "./flashcards-client";

/**
 * Flash Card Sets list page.
 * @returns The rendered page.
 */
export default async function FlashcardsPage(): Promise<React.JSX.Element> {
  const sets = await getFlashCardSets();
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-1 text-2xl font-semibold">Flashcard Sets</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Create sets, add cards, and study them with the flip viewer.
      </p>
      <FlashcardsClient initialSets={sets} />
    </div>
  );
}
