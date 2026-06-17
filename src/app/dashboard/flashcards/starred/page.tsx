import { getStarredCards } from "../actions";
import { StarredClient } from "./starred-client";

/**
 * Starred flashcards page — shows all starred cards grouped by set.
 * @returns The rendered page.
 */
export default async function StarredPage(): Promise<React.JSX.Element> {
  const groups = await getStarredCards();
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-2xl font-semibold">Starred Cards</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Cards you have starred while studying, grouped by set.
      </p>
      <StarredClient initialGroups={groups} />
    </div>
  );
}
