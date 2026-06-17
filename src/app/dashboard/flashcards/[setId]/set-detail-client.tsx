"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Star, Trash2, Pencil, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { FlashCard, FlashCardSetWithCards, CreateFlashCardInput } from "@/lib/types";
import {
  addCard,
  updateCard,
  deleteCard,
  toggleCardStarred,
  incrementTimesStudied,
} from "../actions";

interface CardFormState {
  term: string;
  definition: string;
  hint: string;
  groupName: string;
}

/**
 * Build an empty card form.
 * @returns A blank form state.
 */
function emptyCardForm(): CardFormState {
  return { term: "", definition: "", hint: "", groupName: "" };
}

/**
 * Convert card form state to an action input payload.
 * @param form The form state.
 * @param sortOrder The card sort order.
 * @returns The action input.
 */
function toCardInput(form: CardFormState, sortOrder: number): CreateFlashCardInput {
  return {
    term: form.term.trim(),
    definition: form.definition.trim(),
    hint: form.hint || null,
    groupName: form.groupName || null,
    sortOrder,
  };
}

/**
 * Study mode: shows one card at a time with flip animation, prev/next navigation.
 * @param props Contains cards array, setId, and a callback when study ends.
 * @returns The rendered study UI.
 */
function StudyMode({
  setId,
  cards,
  onExit,
}: {
  setId: string;
  cards: FlashCard[];
  onExit: () => void;
}): React.JSX.Element {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [finished, setFinished] = useState(false);
  const [, startTransition] = useTransition();

  const card = cards[index];

  /**
   * Advance to the next card (or finish).
   * @returns Nothing.
   */
  function next(): void {
    if (index < cards.length - 1) {
      setIndex((i) => i + 1);
      setFlipped(false);
    } else {
      setFinished(true);
      startTransition(async () => {
        await incrementTimesStudied(setId);
      });
    }
  }

  /**
   * Go back to the previous card.
   * @returns Nothing.
   */
  function prev(): void {
    if (index > 0) {
      setIndex((i) => i - 1);
      setFlipped(false);
    }
  }

  if (finished) {
    return (
      <div className="flex flex-col items-center gap-6 py-12 text-center">
        <p className="text-2xl font-semibold">Session complete!</p>
        <p className="text-muted-foreground">
          You reviewed {cards.length} card{cards.length !== 1 ? "s" : ""}.
        </p>
        <div className="flex gap-3">
          <Button
            onClick={() => {
              setIndex(0);
              setFlipped(false);
              setFinished(false);
            }}
          >
            <RotateCcw className="h-4 w-4" />
            Study again
          </Button>
          <Button variant="outline" onClick={onExit}>
            Back to cards
          </Button>
        </div>
      </div>
    );
  }

  if (!card) return <p className="text-muted-foreground">No cards to study.</p>;

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-sm text-muted-foreground">
        {index + 1} / {cards.length}
      </p>

      <button
        type="button"
        className="relative h-52 w-full max-w-lg cursor-pointer select-none"
        onClick={() => setFlipped((f) => !f)}
        aria-label={flipped ? "Show term" : "Show definition"}
      >
        <div
          className={cn(
            "absolute inset-0 rounded-xl border bg-card shadow transition-transform duration-300 [backface-visibility:hidden]",
            flipped && "rotate-y-180",
          )}
          style={{ transformStyle: "preserve-3d" }}
        >
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6 [backface-visibility:hidden]">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {flipped ? "Definition" : "Term"}
            </p>
            <p className="text-center text-xl font-semibold">
              {flipped ? card.definition : card.term}
            </p>
            {!flipped && card.hint ? (
              <p className="text-sm text-muted-foreground">Hint: {card.hint}</p>
            ) : null}
          </div>
        </div>
      </button>

      <p className="text-xs text-muted-foreground">Click card to flip</p>

      <div className="flex gap-3">
        <Button variant="outline" onClick={prev} disabled={index === 0}>
          <ChevronLeft className="h-4 w-4" />
          Prev
        </Button>
        <Button onClick={next}>
          {index < cards.length - 1 ? (
            <>
              Next
              <ChevronRight className="h-4 w-4" />
            </>
          ) : (
            "Finish"
          )}
        </Button>
      </div>
      <Button variant="ghost" size="sm" onClick={onExit}>
        Exit study mode
      </Button>
    </div>
  );
}

/**
 * Full set detail page client: card list, add/edit/delete, star, and study mode.
 * @param props Contains the server-loaded set with all cards.
 * @returns The rendered client UI.
 */
export function SetDetailClient({
  initialSet,
}: {
  initialSet: FlashCardSetWithCards;
}): React.JSX.Element {
  const [set, setSet] = useState<FlashCardSetWithCards>(initialSet);
  const [cardForm, setCardForm] = useState<CardFormState>(emptyCardForm());
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [showCardForm, setShowCardForm] = useState(false);
  const [studying, setStudying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  /**
   * Submit the card form (create or update).
   * @param event The form event.
   * @returns Nothing.
   */
  function handleCardSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setError(null);
    if (!cardForm.term.trim() || !cardForm.definition.trim()) {
      setError("Term and definition are required.");
      return;
    }
    startTransition(async () => {
      try {
        let updated: FlashCardSetWithCards | null;
        if (editingCardId) {
          const existing = set.cards.find((c) => c.id === editingCardId);
          updated = await updateCard(
            set.id,
            editingCardId,
            toCardInput(cardForm, existing?.sortOrder ?? set.cards.length),
          );
          setEditingCardId(null);
        } else {
          updated = await addCard(
            set.id,
            toCardInput(cardForm, set.cards.length),
          );
        }
        if (updated) setSet(updated);
        setCardForm(emptyCardForm());
        setShowCardForm(false);
      } catch {
        setError("Could not save card.");
      }
    });
  }

  /**
   * Load a card into the edit form.
   * @param card The card to edit.
   * @returns Nothing.
   */
  function startEditCard(card: FlashCard): void {
    setEditingCardId(card.id);
    setCardForm({
      term: card.term,
      definition: card.definition,
      hint: card.hint ?? "",
      groupName: card.groupName ?? "",
    });
    setShowCardForm(true);
  }

  /**
   * Delete a card from the set.
   * @param cardId The card id.
   * @returns Nothing.
   */
  function handleDeleteCard(cardId: string): void {
    startTransition(async () => {
      try {
        const updated = await deleteCard(set.id, cardId);
        if (updated) setSet(updated);
      } catch {
        setError("Could not delete card.");
      }
    });
  }

  /**
   * Toggle a card's starred state.
   * @param card The card.
   * @returns Nothing.
   */
  function handleToggleStar(card: FlashCard): void {
    startTransition(async () => {
      try {
        const updated = await toggleCardStarred(set.id, card.id, !card.starred);
        if (updated) setSet(updated);
      } catch {
        setError("Could not update star.");
      }
    });
  }

  if (studying) {
    return (
      <StudyMode
        setId={set.id}
        cards={set.cards}
        onExit={() => setStudying(false)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button
          disabled={set.cards.length === 0 || isPending}
          onClick={() => setStudying(true)}
        >
          Study {set.cards.length} card{set.cards.length !== 1 ? "s" : ""}
        </Button>
        {!showCardForm ? (
          <Button
            variant="outline"
            onClick={() => setShowCardForm(true)}
          >
            Add card
          </Button>
        ) : null}
      </div>

      {showCardForm ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingCardId ? "Edit card" : "Add card"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCardSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <Label htmlFor="term">Term *</Label>
                <Textarea
                  id="term"
                  rows={2}
                  value={cardForm.term}
                  onChange={(e) =>
                    setCardForm((prev) => ({ ...prev, term: e.target.value }))
                  }
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="definition">Definition *</Label>
                <Textarea
                  id="definition"
                  rows={3}
                  value={cardForm.definition}
                  onChange={(e) =>
                    setCardForm((prev) => ({
                      ...prev,
                      definition: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="hint">Hint</Label>
                  <Input
                    id="hint"
                    value={cardForm.hint}
                    onChange={(e) =>
                      setCardForm((prev) => ({ ...prev, hint: e.target.value }))
                    }
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="groupName">Group</Label>
                  <Input
                    id="groupName"
                    value={cardForm.groupName}
                    onChange={(e) =>
                      setCardForm((prev) => ({
                        ...prev,
                        groupName: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              {error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : null}
              <div className="flex gap-2">
                <Button type="submit" disabled={isPending}>
                  {editingCardId ? "Save card" : "Add card"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCardForm(false);
                    setEditingCardId(null);
                    setCardForm(emptyCardForm());
                    setError(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {set.cards.length === 0 ? (
        <p className="text-sm text-muted-foreground">No cards yet. Add one above.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {set.cards.map((card, i) => (
            <Card key={card.id}>
              <CardContent className="flex items-start justify-between gap-4 pt-4">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  {card.groupName ? (
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {card.groupName}
                    </p>
                  ) : null}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Term</p>
                      <p className="font-medium">{card.term}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Definition</p>
                      <p className="text-sm">{card.definition}</p>
                    </div>
                  </div>
                  {card.hint ? (
                    <p className="text-xs text-muted-foreground">
                      Hint: {card.hint}
                    </p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">#{i + 1}</p>
                </div>
                <div className="flex shrink-0 flex-col gap-1.5">
                  <Button
                    size="sm"
                    variant={card.starred ? "default" : "outline"}
                    disabled={isPending}
                    onClick={() => handleToggleStar(card)}
                    aria-label={card.starred ? "Unstar" : "Star"}
                  >
                    <Star
                      className="h-4 w-4"
                      fill={card.starred ? "currentColor" : "none"}
                    />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isPending}
                    onClick={() => startEditCard(card)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={isPending}
                    onClick={() => handleDeleteCard(card.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
