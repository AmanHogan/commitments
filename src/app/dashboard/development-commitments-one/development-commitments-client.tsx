"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  CreateDevelopmentCommitmentOneInput,
  DevelopmentCommitmentOne,
  LearningModuleInput,
} from "@/lib/types";
import {
  createDevelopmentCommitment,
  updateDevelopmentCommitment,
  deleteDevelopmentCommitment,
} from "./actions";

/**
 * Convert a commitment plus modules into a server-action input payload.
 * @param item The commitment.
 * @param modules The modules to attach.
 * @returns The input payload.
 */
function toInput(
  item: DevelopmentCommitmentOne,
  modules: LearningModuleInput[],
): CreateDevelopmentCommitmentOneInput {
  return {
    itemName: item.itemName,
    itemDate: item.itemDate,
    modules,
  };
}

/**
 * Interactive manager for Development Commitments and their learning modules.
 * @param props Contains the server-loaded `initialItems`.
 * @returns The rendered client UI.
 */
export function DevelopmentCommitmentsClient({
  initialItems,
}: {
  initialItems: DevelopmentCommitmentOne[];
}): React.JSX.Element {
  const [items, setItems] = useState<DevelopmentCommitmentOne[]>(initialItems);
  const [itemName, setItemName] = useState("");
  const [itemDate, setItemDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  /**
   * Create a new development commitment.
   * @param event The form submit event.
   * @returns Nothing.
   */
  function handleCreate(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setError(null);
    if (!itemName.trim()) {
      setError("Name is required.");
      return;
    }
    startTransition(async () => {
      try {
        const created = await createDevelopmentCommitment({
          itemName: itemName.trim(),
          itemDate: itemDate || null,
          modules: [],
        });
        setItems((prev) => [created, ...prev]);
        setItemName("");
        setItemDate("");
      } catch {
        setError("Could not create commitment.");
      }
    });
  }

  /**
   * Persist a modified commitment (used for module add/toggle/remove).
   * @param item The full commitment with new modules applied.
   * @returns Nothing.
   */
  function persist(item: DevelopmentCommitmentOne): void {
    const modules: LearningModuleInput[] = item.modules.map((mod) => ({
      moduleName: mod.moduleName,
      type: mod.type,
      hours: mod.hours,
      dateStarted: mod.dateStarted,
      dateFinished: mod.dateFinished,
      finished: mod.finished,
      required: mod.required,
      description: mod.description,
    }));
    startTransition(async () => {
      try {
        const updated = await updateDevelopmentCommitment(
          item.id,
          toInput(item, modules),
        );
        if (updated) {
          setItems((prev) =>
            prev.map((existing) =>
              existing.id === item.id ? updated : existing,
            ),
          );
        }
      } catch {
        setError("Could not update modules.");
      }
    });
  }

  /**
   * Delete a commitment.
   * @param id The commitment id.
   * @returns Nothing.
   */
  function handleDelete(id: string): void {
    startTransition(async () => {
      try {
        await deleteDevelopmentCommitment(id);
        setItems((prev) => prev.filter((item) => item.id !== id));
      } catch {
        setError("Could not delete commitment.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent>
          <form
            onSubmit={handleCreate}
            className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto]"
          >
            <div className="flex flex-col gap-1">
              <Label htmlFor="itemName">Item</Label>
              <Input
                id="itemName"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="e.g. AWS certification"
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="itemDate">Date</Label>
              <Input
                id="itemDate"
                type="date"
                value={itemDate}
                onChange={(e) => setItemDate(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={isPending}>
                Add
              </Button>
            </div>
          </form>
          {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing yet.</p>
        ) : (
          items.map((item) => (
            <CommitmentCard
              key={item.id}
              item={item}
              disabled={isPending}
              onPersist={persist}
              onDelete={() => handleDelete(item.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

/**
 * Single commitment card with its learning modules.
 * @param props The commitment and its callbacks.
 * @returns The rendered card.
 */
function CommitmentCard({
  item,
  disabled,
  onPersist,
  onDelete,
}: {
  item: DevelopmentCommitmentOne;
  disabled: boolean;
  onPersist: (item: DevelopmentCommitmentOne) => void;
  onDelete: () => void;
}): React.JSX.Element {
  const [name, setName] = useState("");
  const [hours, setHours] = useState("");

  /**
   * Add a module to this commitment.
   * @returns Nothing.
   */
  function addModule(): void {
    if (!name.trim()) {
      return;
    }
    onPersist({
      ...item,
      modules: [
        ...item.modules,
        {
          id: "temp",
          moduleName: name.trim(),
          type: null,
          hours: hours ? Number(hours) : null,
          dateStarted: null,
          dateFinished: null,
          finished: false,
          required: false,
          description: null,
        },
      ],
    });
    setName("");
    setHours("");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {item.itemName}
          {item.itemDate ? (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {item.itemDate}
            </span>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm">
        {item.modules.length > 0 ? (
          <ul className="flex flex-col gap-1">
            {item.modules.map((mod) => (
              <li key={mod.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={mod.finished}
                  disabled={disabled}
                  onChange={() =>
                    onPersist({
                      ...item,
                      modules: item.modules.map((m) =>
                        m.id === mod.id ? { ...m, finished: !m.finished } : m,
                      ),
                    })
                  }
                />
                <span
                  className={mod.finished ? "line-through text-muted-foreground" : ""}
                >
                  {mod.moduleName}
                  {mod.hours != null ? ` (${mod.hours}h)` : ""}
                </span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="ml-auto"
                  disabled={disabled}
                  onClick={() =>
                    onPersist({
                      ...item,
                      modules: item.modules.filter((m) => m.id !== mod.id),
                    })
                  }
                  aria-label="Remove module"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-1 flex gap-2">
          <Input
            placeholder="Module name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            type="number"
            placeholder="hrs"
            className="w-20"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={addModule}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
      <CardFooter className="justify-end">
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
