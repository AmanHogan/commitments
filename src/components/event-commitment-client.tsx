"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Trash2, Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  CreateEventCommitmentInput,
  EventCommitment,
  EventSubItemInput,
} from "@/lib/types";

export interface EventCommitmentActions {
  create: (input: CreateEventCommitmentInput) => Promise<EventCommitment>;
  update: (
    id: string,
    input: CreateEventCommitmentInput,
  ) => Promise<EventCommitment | null>;
  remove: (id: string) => Promise<void>;
}

interface EventFormState {
  eventName: string;
  type: string;
  description: string;
  started: string;
  finished: string;
  required: boolean;
  done: boolean;
}

/**
 * Build an empty event form state.
 * @returns A blank event form.
 */
function emptyForm(): EventFormState {
  return {
    eventName: "",
    type: "",
    description: "",
    started: "",
    finished: "",
    required: false,
    done: false,
  };
}

/**
 * Convert a form state plus sub-items into a create/update input payload.
 * @param form The event form state.
 * @param subItems The sub-items to attach.
 * @returns The input payload for the server action.
 */
function toInput(
  form: EventFormState,
  subItems: EventSubItemInput[],
): CreateEventCommitmentInput {
  return {
    eventName: form.eventName.trim(),
    type: form.type || null,
    description: form.description || null,
    started: form.started || null,
    finished: form.finished || null,
    required: form.required,
    done: form.done,
    subItems,
  };
}

/**
 * Reusable CRUD UI for event commitments (Development Two / Business Two):
 * create/edit/delete events plus add/toggle/remove embedded sub-items.
 * @param props The page labels, initial items, and the bound server actions.
 * @returns The rendered event-commitment manager.
 */
export function EventCommitmentClient({
  title,
  description,
  itemNoun,
  initialItems,
  actions,
}: {
  title: string;
  description: string;
  itemNoun: string;
  initialItems: EventCommitment[];
  actions: EventCommitmentActions;
}): React.JSX.Element {
  const [items, setItems] = useState<EventCommitment[]>(initialItems);
  const [form, setForm] = useState<EventFormState>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  /**
   * Create or update an event from the form.
   * @param event The form submit event.
   * @returns Nothing.
   */
  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setError(null);
    if (!form.eventName.trim()) {
      setError("Event name is required.");
      return;
    }
    const existing = editingId
      ? items.find((item) => item.id === editingId)
      : undefined;
    const subItems: EventSubItemInput[] = (existing?.subItems ?? []).map(
      (sub) => ({
        subEventName: sub.subEventName,
        description: sub.description,
        started: sub.started,
        finished: sub.finished,
        done: sub.done,
      }),
    );
    const payload = toInput(form, subItems);

    startTransition(async () => {
      try {
        if (editingId) {
          const updated = await actions.update(editingId, payload);
          if (updated) {
            setItems((prev) =>
              prev.map((item) => (item.id === editingId ? updated : item)),
            );
          }
          setEditingId(null);
        } else {
          const created = await actions.create(payload);
          setItems((prev) => [created, ...prev]);
        }
        setForm(emptyForm());
      } catch {
        setError("Could not save.");
      }
    });
  }

  /**
   * Load an item into the form for editing.
   * @param item The item to edit.
   * @returns Nothing.
   */
  function startEdit(item: EventCommitment): void {
    setEditingId(item.id);
    setForm({
      eventName: item.eventName,
      type: item.type ?? "",
      description: item.description ?? "",
      started: item.started ?? "",
      finished: item.finished ?? "",
      required: item.required,
      done: item.done,
    });
  }

  /**
   * Delete an item.
   * @param id The item id.
   * @returns Nothing.
   */
  function handleDelete(id: string): void {
    startTransition(async () => {
      try {
        await actions.remove(id);
        setItems((prev) => prev.filter((item) => item.id !== id));
      } catch {
        setError("Could not delete.");
      }
    });
  }

  /**
   * Persist a modified item (used for sub-item add/toggle/remove).
   * @param item The full item with its new sub-items applied.
   * @returns Nothing.
   */
  function persistItem(item: EventCommitment): void {
    const payload = toInput(
      {
        eventName: item.eventName,
        type: item.type ?? "",
        description: item.description ?? "",
        started: item.started ?? "",
        finished: item.finished ?? "",
        required: item.required,
        done: item.done,
      },
      item.subItems.map((sub) => ({
        subEventName: sub.subEventName,
        description: sub.description,
        started: sub.started,
        finished: sub.finished,
        done: sub.done,
      })),
    );
    startTransition(async () => {
      try {
        const updated = await actions.update(item.id, payload);
        if (updated) {
          setItems((prev) =>
            prev.map((existing) =>
              existing.id === item.id ? updated : existing,
            ),
          );
        }
      } catch {
        setError("Could not update sub-items.");
      }
    });
  }

  /**
   * Add a sub-item (from the per-card input) to an item and persist.
   * @param item The parent item.
   * @param name The new sub-item name.
   * @returns Nothing.
   */
  function addSubItem(item: EventCommitment, name: string): void {
    if (!name.trim()) {
      return;
    }
    persistItem({
      ...item,
      subItems: [
        ...item.subItems,
        {
          id: "temp",
          subEventName: name.trim(),
          description: null,
          started: null,
          finished: null,
          done: false,
        },
      ],
    });
  }

  /**
   * Toggle a sub-item's done flag and persist.
   * @param item The parent item.
   * @param subId The sub-item id.
   * @returns Nothing.
   */
  function toggleSubItem(item: EventCommitment, subId: string): void {
    persistItem({
      ...item,
      subItems: item.subItems.map((sub) =>
        sub.id === subId ? { ...sub, done: !sub.done } : sub,
      ),
    });
  }

  /**
   * Remove a sub-item and persist.
   * @param item The parent item.
   * @param subId The sub-item id.
   * @returns Nothing.
   */
  function removeSubItem(item: EventCommitment, subId: string): void {
    persistItem({
      ...item,
      subItems: item.subItems.filter((sub) => sub.id !== subId),
    });
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-2xl font-semibold">{title}</h1>
      <p className="mb-6 text-sm text-muted-foreground">{description}</p>

      <Card className="mb-6">
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="eventName">{itemNoun} name</Label>
              <Input
                id="eventName"
                value={form.eventName}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, eventName: e.target.value }))
                }
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="type">Type</Label>
              <Input
                id="type"
                value={form.type}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, type: e.target.value }))
                }
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
                <Label htmlFor="started">Started</Label>
                <Input
                  id="started"
                  type="date"
                  value={form.started}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, started: e.target.value }))
                  }
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="finished">Finished</Label>
                <Input
                  id="finished"
                  type="date"
                  value={form.finished}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, finished: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.required}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, required: e.target.checked }))
                  }
                />
                Required
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.done}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, done: e.target.checked }))
                  }
                />
                Done
              </label>
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex gap-2">
              <Button type="submit" disabled={isPending}>
                {editingId ? "Save changes" : `Add ${itemNoun.toLowerCase()}`}
              </Button>
              {editingId ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingId(null);
                    setForm(emptyForm());
                  }}
                >
                  Cancel
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing yet.</p>
        ) : (
          items.map((item) => (
            <EventCard
              key={item.id}
              item={item}
              disabled={isPending}
              onEdit={() => startEdit(item)}
              onDelete={() => handleDelete(item.id)}
              onAddSub={(name) => addSubItem(item, name)}
              onToggleSub={(subId) => toggleSubItem(item, subId)}
              onRemoveSub={(subId) => removeSubItem(item, subId)}
            />
          ))
        )}
      </div>
    </div>
  );
}

/**
 * Single event card with its sub-items and a sub-item add input.
 * @param props The item and its action callbacks.
 * @returns The rendered card.
 */
function EventCard({
  item,
  disabled,
  onEdit,
  onDelete,
  onAddSub,
  onToggleSub,
  onRemoveSub,
}: {
  item: EventCommitment;
  disabled: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onAddSub: (name: string) => void;
  onToggleSub: (subId: string) => void;
  onRemoveSub: (subId: string) => void;
}): React.JSX.Element {
  const [subDraft, setSubDraft] = useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {item.eventName}
          {item.done ? (
            <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
              done
            </span>
          ) : null}
          {item.required ? (
            <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
              required
            </span>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm">
        {item.description ? <p>{item.description}</p> : null}
        <p className="text-xs text-muted-foreground">
          {item.type ? `${item.type} • ` : ""}
          {item.started ?? "—"} → {item.finished ?? "—"}
        </p>
        {item.subItems.length > 0 ? (
          <ul className="mt-1 flex flex-col gap-1">
            {item.subItems.map((sub) => (
              <li key={sub.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={sub.done}
                  disabled={disabled}
                  onChange={() => onToggleSub(sub.id)}
                />
                <span className={sub.done ? "line-through text-muted-foreground" : ""}>
                  {sub.subEventName}
                </span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="ml-auto"
                  disabled={disabled}
                  onClick={() => onRemoveSub(sub.id)}
                  aria-label="Remove sub-item"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-1 flex gap-2">
          <Input
            placeholder="Add sub-item"
            value={subDraft}
            onChange={(e) => setSubDraft(e.target.value)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => {
              onAddSub(subDraft);
              setSubDraft("");
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button variant="outline" size="sm" disabled={disabled} onClick={onEdit}>
          <Pencil className="h-4 w-4" />
          Edit
        </Button>
        <Button
          variant="destructive"
          size="sm"
          disabled={disabled}
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </CardFooter>
    </Card>
  );
}
