"use client";

import { useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { Trash2, Pencil, BookOpen, Tag } from "lucide-react";
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
import type { FlashCardSet, CreateFlashCardSetInput } from "@/lib/types";
import {
  createFlashCardSet,
  updateFlashCardSet,
  deleteFlashCardSet,
} from "./actions";

interface FormState {
  title: string;
  description: string;
  topic: string;
  tagsRaw: string;
}

/**
 * Build an empty flash card set form state.
 * @returns A blank form.
 */
function emptyForm(): FormState {
  return { title: "", description: "", topic: "", tagsRaw: "" };
}

/**
 * Convert form state to a create/update input payload.
 * @param form The current form state.
 * @returns The input payload.
 */
function toInput(form: FormState): CreateFlashCardSetInput {
  return {
    title: form.title.trim(),
    description: form.description || null,
    topic: form.topic || null,
    tags: form.tagsRaw
      ? form.tagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
      : [],
  };
}

/**
 * Interactive manager for flash card sets: create, edit, delete, and navigate to study.
 * @param props Contains the server-loaded `initialSets`.
 * @returns The rendered client UI.
 */
export function FlashcardsClient({
  initialSets,
}: {
  initialSets: FlashCardSet[];
}): React.JSX.Element {
  const [sets, setSets] = useState<FlashCardSet[]>(initialSets);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  /**
   * Handle form submit for create or update.
   * @param event The form submit event.
   * @returns Nothing.
   */
  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setError(null);
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    const payload = toInput(form);
    startTransition(async () => {
      try {
        if (editingId) {
          const updated = await updateFlashCardSet(editingId, payload);
          if (updated) {
            setSets((prev) => prev.map((s) => (s.id === editingId ? updated : s)));
          }
          setEditingId(null);
        } else {
          const created = await createFlashCardSet(payload);
          setSets((prev) => [created, ...prev]);
        }
        setForm(emptyForm());
        setShowForm(false);
      } catch {
        setError("Could not save set.");
      }
    });
  }

  /**
   * Load a set into the form for editing.
   * @param set The set to edit.
   * @returns Nothing.
   */
  function startEdit(set: FlashCardSet): void {
    setEditingId(set.id);
    setForm({
      title: set.title,
      description: set.description ?? "",
      topic: set.topic ?? "",
      tagsRaw: set.tags.join(", "),
    });
    setShowForm(true);
  }

  /**
   * Delete a flash card set.
   * @param id The set id.
   * @returns Nothing.
   */
  function handleDelete(id: string): void {
    startTransition(async () => {
      try {
        await deleteFlashCardSet(id);
        setSets((prev) => prev.filter((s) => s.id !== id));
      } catch {
        setError("Could not delete set.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {!showForm ? (
        <Button className="self-start" onClick={() => setShowForm(true)}>
          New set
        </Button>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Edit set" : "New set"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, title: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  rows={2}
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="topic">Topic</Label>
                  <Input
                    id="topic"
                    value={form.topic}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, topic: e.target.value }))
                    }
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    value={form.tagsRaw}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, tagsRaw: e.target.value }))
                    }
                    placeholder="e.g. k8s, networking"
                  />
                </div>
              </div>
              {error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : null}
              <div className="flex gap-2">
                <Button type="submit" disabled={isPending}>
                  {editingId ? "Save changes" : "Create set"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                    setForm(emptyForm());
                    setError(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {sets.length === 0 ? (
        <p className="text-sm text-muted-foreground">No flash card sets yet.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {sets.map((set) => (
            <Card key={set.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-base">{set.title}</CardTitle>
                    {set.topic ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {set.topic}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isPending}
                      onClick={() => startEdit(set)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={isPending}
                      onClick={() => handleDelete(set.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col justify-between gap-3 pt-0">
                {set.description ? (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {set.description}
                  </p>
                ) : null}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {set.cardCount} card{set.cardCount !== 1 ? "s" : ""}
                  </span>
                  {set.timesStudied > 0 ? (
                    <span className="text-xs text-muted-foreground">
                      · studied {set.timesStudied}×
                    </span>
                  ) : null}
                  {set.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {set.tags.map((tag) => (
                        <span
                          key={tag}
                          className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs"
                        >
                          <Tag className="h-3 w-3" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                <Link href={`/dashboard/flashcards/${set.id}`}>
                  <Button size="sm" className="w-full" variant="outline">
                    <BookOpen className="h-4 w-4" />
                    Open &amp; Study
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
