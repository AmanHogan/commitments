"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Trash2, Pencil, Plus } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  COMMITMENT_STATUSES,
  VALUE_CATEGORIES,
  type BusinessCommitmentOne,
  type CommitmentStatus,
  type CreateBusinessCommitmentOneInput,
  type ValueEntry,
} from "@/lib/types";
import {
  createBusinessCommitment,
  updateBusinessCommitment,
  deleteBusinessCommitment,
} from "./actions";

interface FormState {
  workItem: string;
  applicationContext: string;
  description: string;
  problemOpportunity: string;
  whoBenefited: string;
  impact: string;
  alignment: string;
  statusNotes: string;
  started: string;
  dateCompleted: string;
  status: CommitmentStatus;
  valueEntries: ValueEntry[];
}

/**
 * Build an empty business-commitment form state.
 * @returns A blank form.
 */
function emptyForm(): FormState {
  return {
    workItem: "",
    applicationContext: "",
    description: "",
    problemOpportunity: "",
    whoBenefited: "",
    impact: "",
    alignment: "",
    statusNotes: "",
    started: "",
    dateCompleted: "",
    status: "IN_PROGRESS",
    valueEntries: [],
  };
}

/**
 * Convert the form state into a server-action input payload.
 * @param form The current form state.
 * @returns The create/update input.
 */
function toInput(form: FormState): CreateBusinessCommitmentOneInput {
  return {
    workItem: form.workItem.trim(),
    applicationContext: form.applicationContext || null,
    description: form.description || null,
    problemOpportunity: form.problemOpportunity || null,
    whoBenefited: form.whoBenefited || null,
    impact: form.impact || null,
    alignment: form.alignment || null,
    statusNotes: form.statusNotes || null,
    started: form.started || null,
    dateCompleted: form.dateCompleted || null,
    status: form.status,
    valueEntries: form.valueEntries,
  };
}

/**
 * Interactive manager for Business Partner Impact commitments.
 * @param props Contains the server-loaded `initialCommitments`.
 * @returns The rendered client UI.
 */
export function BusinessCommitmentsClient({
  initialCommitments,
}: {
  initialCommitments: BusinessCommitmentOne[];
}): React.JSX.Element {
  const [commitments, setCommitments] =
    useState<BusinessCommitmentOne[]>(initialCommitments);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [valueLabel, setValueLabel] = useState<string>(VALUE_CATEGORIES[0]);
  const [valueText, setValueText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  /**
   * Add the staged value entry to the form.
   * @returns Nothing.
   */
  function addValueEntry(): void {
    if (!valueText.trim()) {
      return;
    }
    setForm((prev) => ({
      ...prev,
      valueEntries: [
        ...prev.valueEntries,
        { label: valueLabel, value: valueText.trim() },
      ],
    }));
    setValueText("");
  }

  /**
   * Remove a value entry from the form by index.
   * @param index The entry index.
   * @returns Nothing.
   */
  function removeValueEntry(index: number): void {
    setForm((prev) => ({
      ...prev,
      valueEntries: prev.valueEntries.filter((_, i) => i !== index),
    }));
  }

  /**
   * Create or update the commitment from the form.
   * @param event The form submit event.
   * @returns Nothing.
   */
  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setError(null);
    if (!form.workItem.trim()) {
      setError("Work item is required.");
      return;
    }
    const payload = toInput(form);
    startTransition(async () => {
      try {
        if (editingId) {
          const updated = await updateBusinessCommitment(editingId, payload);
          if (updated) {
            setCommitments((prev) =>
              prev.map((c) => (c.id === editingId ? updated : c)),
            );
          }
          setEditingId(null);
        } else {
          const created = await createBusinessCommitment(payload);
          setCommitments((prev) => [created, ...prev]);
        }
        setForm(emptyForm());
      } catch {
        setError("Could not save commitment.");
      }
    });
  }

  /**
   * Load a commitment into the form for editing.
   * @param commitment The commitment to edit.
   * @returns Nothing.
   */
  function startEdit(commitment: BusinessCommitmentOne): void {
    setEditingId(commitment.id);
    setForm({
      workItem: commitment.workItem,
      applicationContext: commitment.applicationContext ?? "",
      description: commitment.description ?? "",
      problemOpportunity: commitment.problemOpportunity ?? "",
      whoBenefited: commitment.whoBenefited ?? "",
      impact: commitment.impact ?? "",
      alignment: commitment.alignment ?? "",
      statusNotes: commitment.statusNotes ?? "",
      started: commitment.started ?? "",
      dateCompleted: commitment.dateCompleted ?? "",
      status: commitment.status,
      valueEntries: commitment.valueEntries,
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
        await deleteBusinessCommitment(id);
        setCommitments((prev) => prev.filter((c) => c.id !== id));
      } catch {
        setError("Could not delete commitment.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <Field label="Work item *">
              <Input
                value={form.workItem}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, workItem: e.target.value }))
                }
                required
              />
            </Field>
            <Field label="Application context">
              <Input
                value={form.applicationContext}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    applicationContext: e.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Description">
              <Textarea
                rows={2}
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, description: e.target.value }))
                }
              />
            </Field>
            <Field label="Problem / Opportunity">
              <Textarea
                rows={2}
                value={form.problemOpportunity}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    problemOpportunity: e.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Who benefited">
              <Textarea
                rows={2}
                value={form.whoBenefited}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, whoBenefited: e.target.value }))
                }
              />
            </Field>
            <Field label="Impact">
              <Textarea
                rows={2}
                value={form.impact}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, impact: e.target.value }))
                }
              />
            </Field>
            <Field label="Alignment">
              <Input
                value={form.alignment}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, alignment: e.target.value }))
                }
              />
            </Field>
            <Field label="Status notes">
              <Textarea
                rows={2}
                value={form.statusNotes}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, statusNotes: e.target.value }))
                }
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date started">
                <Input
                  type="date"
                  value={form.started}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, started: e.target.value }))
                  }
                />
              </Field>
              <Field label="Date completed">
                <Input
                  type="date"
                  value={form.dateCompleted}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      dateCompleted: e.target.value,
                    }))
                  }
                />
              </Field>
            </div>
            <Field label="Status">
              <Select
                value={form.status}
                onValueChange={(val) =>
                  setForm((prev) => ({
                    ...prev,
                    status: val as CommitmentStatus,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMMITMENT_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
              <span className="text-sm font-medium">Value entries</span>
              {form.valueEntries.map((entry, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{entry.label}:</span>
                  <span className="min-w-0 truncate">{entry.value}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="ml-auto"
                    onClick={() => removeValueEntry(i)}
                    aria-label="Remove value entry"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <Select value={valueLabel} onValueChange={setValueLabel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VALUE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea
                rows={2}
                placeholder="Describe the accomplishment and impact"
                value={valueText}
                onChange={(e) => setValueText(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="self-end"
                onClick={addValueEntry}
              >
                <Plus className="h-4 w-4" />
                Add value entry
              </Button>
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex gap-2">
              <Button type="submit" disabled={isPending}>
                {editingId ? "Save changes" : "Add commitment"}
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
        {commitments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No commitments yet.</p>
        ) : (
          commitments.map((c) => (
            <Card key={c.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {c.workItem}
                  <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                    {c.status.replace("_", " ")}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm">
                {c.applicationContext ? (
                  <p className="text-muted-foreground">{c.applicationContext}</p>
                ) : null}
                {c.description ? <p>{c.description}</p> : null}
                {c.valueEntries.length > 0 ? (
                  <ul className="mt-1 list-inside list-disc text-xs text-muted-foreground">
                    {c.valueEntries.map((entry, i) => (
                      <li key={i}>
                        <span className="font-medium">{entry.label}:</span>{" "}
                        {entry.value}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  Started: {c.started ?? "—"} • Completed:{" "}
                  {c.dateCompleted ?? "—"}
                </p>
              </CardContent>
              <CardFooter className="justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => startEdit(c)}
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleDelete(c.id)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

/**
 * Labeled vertical form field wrapper.
 * @param props The label text and field control.
 * @returns The rendered field.
 */
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
