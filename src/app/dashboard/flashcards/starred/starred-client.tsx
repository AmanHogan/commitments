"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { FlashCard, StarredSetGroup } from "@/lib/types";
import { toggleCardStarred } from "../actions";

/**
 * Displays all starred cards grouped by their set, with the ability to unstar.
 * @param props Contains the server-loaded `initialGroups`.
 * @returns The rendered client UI.
 */
export function StarredClient({
  initialGroups,
}: {
  initialGroups: StarredSetGroup[];
}): React.JSX.Element {
  const [groups, setGroups] = useState<StarredSetGroup[]>(initialGroups);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  /**
   * Unstar a card and remove it from the local list.
   * @param setId The set the card belongs to.
   * @param card The card to unstar.
   * @returns Nothing.
   */
  function handleUnstar(setId: string, card: FlashCard): void {
    startTransition(async () => {
      try {
        await toggleCardStarred(setId, card.id, false);
        setGroups((prev) =>
          prev
            .map((g) =>
              g.setId === setId
                ? { ...g, cards: g.cards.filter((c) => c.id !== card.id) }
                : g,
            )
            .filter((g) => g.cards.length > 0),
        );
      } catch {
        setError("Could not update star.");
      }
    });
  }

  const totalStarred = groups.reduce((sum, g) => sum + g.cards.length, 0);

  return (
    <div className="flex flex-col gap-6">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {totalStarred === 0 ? (
        <p className="text-sm text-muted-foreground">
          No starred cards yet. Star cards while studying a set.
        </p>
      ) : (
        groups.map((group) => (
          <div key={group.setId} className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Link
                href={`/dashboard/flashcards/${group.setId}`}
                className="text-base font-semibold hover:underline"
              >
                {group.setTitle}
              </Link>
              <span className="text-xs text-muted-foreground">
                ({group.cards.length} starred)
              </span>
            </div>
            {group.cards.map((card) => (
              <Card key={card.id}>
                <CardHeader className="pb-1 pt-4">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm font-medium">{card.term}</CardTitle>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isPending}
                      onClick={() => handleUnstar(group.setId, card)}
                      aria-label="Unstar"
                    >
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground">
                    {card.definition}
                  </p>
                  {card.hint ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Hint: {card.hint}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
