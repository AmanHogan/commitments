"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { Trash2, Pencil, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  CRITICALITY_OPTIONS,
  type ActionItem,
  type CreateActionItemInput,
  type Criticality,
} from "@/lib/types";
import {
  createActionItem,
  updateActionItem,
  deleteActionItem,
} from "./actions";

const CRITICALITY_COLORS: Record<Criticality, string> = {
  LOW: "bg-green-100 text-green-800",
  MEDIUM: "bg-yellow-100 text-yellow-800",
  HIGH: "bg-orange-100 text-orange-800",
  CRITICAL: "bg-red-100 text-red-800",
};

const CRITICALITY_RANK: Record<Criticality, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

type SortField = "none" | "dateStarted" | "criticality" | "completed";
type SortDirection = "asc" | "desc";

interface FormState {
  name: string;
  description: string;
  criticality: Criticality | "";
  dateStarted: string;
  dateFinished: string;
  dueDate: string;
  dueTime: string;
  completed: boolean;
}

/**
 * Build an empty action-item form state.
 * @returns A blank form.
 */
function emptyForm(): FormState {
  return {
    name: "",
    description: "",
    criticality: "",
    dateStarted: "",
    dateFinished: "",
    dueDate: "",
    dueTime: "",
    completed: false,
  };
}

/**
 * Convert form state into a server-action input payload.
 * @param form The current form state.
 * @returns The create/update input.
 */
function toInput(form: FormState): CreateActionItemInput {
  return {
    name: form.name.trim(),
    description: form.description || null,
    criticality: form.criticality || null,
    dateStarted: form.dateStarted || null,
    dateFinished: form.dateFinished || null,
    dueDate: form.dueDate || null,
    dueTime: form.dueTime || null,
    completed: form.completed,
  };
}

/**
 * Interactive manager for action items: create/edit/delete, mark done, and sort.
 * @param props Contains the server-loaded `initialItems`.
 * @returns The rendered client UI.
 */
export function ActionItemsClient({
  initialItems,
}: {
  initialItems: ActionItem[];
}): React.JSX.Element {
  const [items, setItems] = useState<ActionItem[]>(initialItems);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("none");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const today = new Date().toISOString().slice(0, 10);

  const sortedItems = useMemo<ActionItem[]>(() => {
    if (sortField === "none") {
      return items;
    }
    const sorted = [...items];
    sorted.sort((a, b) => {
      let result = 0;
      if (sortField === "dateStarted") {
        result = (a.dateStarted ?? "").localeCompare(b.dateStarted ?? "");
      } else if (sortField === "criticality") {
        result =
          (a.criticality ? CRITICALITY_RANK[a.criticality] : 0) -
          (b.criticality ? CRITICALITY_RANK[b.criticality] : 0);
      } else {
        result = Number(a.completed) - Number(b.completed);
      }
      return sortDirection === "asc" ? result : -result;
    });
    return sorted;
  }, [items, sortField, sortDirection]);

  /**
   * Create or update an action item from the form.
   * @param event The form submit event.
   * @returns Nothing.
   */
  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setError(null);
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    const payload = toInput(form);
    startTransition(async () => {
      try {
        if (editingId) {
          const updated = await updateActionItem(editingId, payload);
          if (updated) {
            setItems((prev) =>
              prev.map((item) => (item.id === editingId ? updated : item)),
            );
          }
          setEditingId(null);
        } else {
          const created = await createActionItem(payload);
          setItems((prev) => [created, ...prev]);
        }
        setForm(emptyForm());
      } catch {
        setError("Could not save action item.");
      }
    });
  }

  /**
   * Load an item into the form for editing.
   * @param item The item to edit.
   * @returns Nothing.
   */
  function startEdit(item: ActionItem): void {
    setEditingId(item.id);
    setForm({
      name: item.name,
      description: item.description ?? "",
      criticality: item.criticality ?? "",
      dateStarted: item.dateStarted ?? "",
      dateFinished: item.dateFinished ?? "",
      dueDate: item.dueDate ?? "",
      dueTime: item.dueTime ?? "",
      completed: item.completed,
    });
  }

  /**
   * Mark an item complete with today's finish date.
   * @param item The item to complete.
   * @returns Nothing.
   */
  function markDone(item: ActionItem): void {
    startTransition(async () => {
      try {
        const updated = await updateActionItem(item.id, {
          name: item.name,
          description: item.description,
          criticality: item.criticality,
          dateStarted: item.dateStarted,
          dateFinished: today,
          dueDate: item.dueDate,
          dueTime: item.dueTime,
          completed: true,
        });
        if (updated) {
          setItems((prev) =>
            prev.map((i) => (i.id === item.id ? updated : i)),
          );
        }
      } catch {
        setError("Could not mark item done.");
      }
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
        await deleteActionItem(id);
        setItems((prev) => prev.filter((item) => item.id !== id));
      } catch {
        setError("Could not delete action item.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Edit action item" : "Add action item"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, description: e.target.value }))
                }
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Criticality</Label>
              <Select
                value={form.criticality}
                onValueChange={(val) =>
                  setForm((prev) => ({
                    ...prev,
                    criticality: val as Criticality,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select criticality" />
                </SelectTrigger>
                <SelectContent>
                  {CRITICALITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <Label htmlFor="dateStarted">Date started</Label>
                <Input
                  id="dateStarted"
                  type="date"
                  value={form.dateStarted}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, dateStarted: e.target.value }))
                  }
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="dateFinished">Date finished</Label>
                <Input
                  id="dateFinished"
                  type="date"
                  value={form.dateFinished}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      dateFinished: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="dueDate">Due date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={form.dueDate}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, dueDate: e.target.value }))
                  }
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="dueTime">Due time</Label>
                <Input
                  id="dueTime"
                  type="time"
                  value={form.dueTime}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, dueTime: e.target.value }))
                  }
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.completed}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, completed: e.target.checked }))
                }
              />
              Completed
            </label>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex gap-2">
              <Button type="submit" disabled={isPending}>
                {editingId ? "Save changes" : "Add item"}
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

      <div className="flex items-center gap-3">
        <Label className="text-sm">Sort by</Label>
        <Select
          value={sortField}
          onValueChange={(val) => setSortField(val as SortField)}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="dateStarted">Date started</SelectItem>
            <SelectItem value="criticality">Criticality</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={sortDirection}
          onValueChange={(val) => setSortDirection(val as SortDirection)}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="asc">Ascending</SelectItem>
            <SelectItem value="desc">Descending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-3">
        {sortedItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">No action items yet.</p>
        ) : (
          sortedItems.map((item) => {
            const isOverdue =
              !item.completed && item.dueDate !== null && item.dueDate < today;
            const isDueToday =
              !item.completed && item.dueDate === today;
            return (
              <Card
                key={item.id}
                className={cn(
                  isOverdue && "ring-red-400",
                  isDueToday && "ring-yellow-400",
                )}
              >
                <CardContent className="flex items-start justify-between gap-4 pt-4">
                  <div className="flex min-w-0 flex-col gap-1">
                    <p className="font-medium">{item.name}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {item.criticality ? (
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 font-semibold",
                            CRITICALITY_COLORS[item.criticality],
                          )}
                        >
                          {item.criticality}
                        </span>
                      ) : null}
                      {item.completed ? (
                        <span className="rounded-full bg-muted px-2 py-0.5 font-semibold">
                          Completed
                        </span>
                      ) : null}
                      {isOverdue ? (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 font-semibold text-red-700">
                          Overdue
                        </span>
                      ) : null}
                      {isDueToday ? (
                        <span className="rounded-full bg-yellow-100 px-2 py-0.5 font-semibold text-yellow-700">
                          Due today
                        </span>
                      ) : null}
                    </div>
                    {item.description ? (
                      <p className="text-sm text-muted-foreground">
                        {item.description}
                      </p>
                    ) : null}
                    {item.dueDate ? (
                      <p className="text-xs text-muted-foreground">
                        Due: {item.dueDate}
                        {item.dueTime ? ` at ${item.dueTime}` : ""}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col gap-1.5">
                    {!item.completed ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={() => markDone(item)}
                      >
                        <Check className="h-4 w-4" />
                        Done
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isPending}
                      onClick={() => startEdit(item)}
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={isPending}
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
