"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus, Pencil, Download, Upload, Info } from "lucide-react";
import { JsonImportModal } from "@/components/json-import-modal";
import { createZip, slugifyFileName } from "@/lib/zip";
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
import type {
  CreateEventCommitmentInput,
  EventCommitment,
  EventSubItem,
  EventSubItemInput,
} from "@/lib/types";

export interface EventCommitmentActions {
  create: (input: CreateEventCommitmentInput) => Promise<EventCommitment>;
  update: (id: string, input: CreateEventCommitmentInput) => Promise<EventCommitment | null>;
  remove: (id: string) => Promise<void>;
  bulkCreate?: (records: unknown[]) => Promise<{ created: number }>;
}

type SortField = "none" | "started" | "finished";
type SortDir = "asc" | "desc";

interface EventFormState {
  eventName: string;
  type: string;
  description: string;
  started: string;
  finished: string;
  required: boolean;
  done: boolean;
}

interface SubDraft {
  subEventName: string;
  description: string;
  started: string;
  finished: string;
  done: boolean;
}

/**
 * Build an empty event form state.
 * @returns A blank event form.
 */
function emptyEventForm(): EventFormState {
  return { eventName: "", type: "", description: "", started: "", finished: "", required: false, done: false };
}

/**
 * Build an empty sub-item draft.
 * @returns A blank sub-item draft.
 */
function emptySubDraft(): SubDraft {
  return { subEventName: "", description: "", started: "", finished: "", done: false };
}

/**
 * Convert a form state and sub-items into a create/update input payload.
 * @param form The event form state.
 * @param subItems The sub-items to attach.
 * @returns The input payload.
 */
function toInput(form: EventFormState, subItems: EventSubItemInput[]): CreateEventCommitmentInput {
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
 * Trigger a browser download of any text blob.
 * @param content The text content.
 * @param filename The full filename including extension.
 * @param mime The MIME type.
 * @returns Nothing.
 */
function downloadBlob(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export event commitments as a JSON file matching the app's import schema.
 * @param items The event commitments to export.
 * @param jsonType The envelope type string (e.g. "bcomm2").
 * @param slug The filename slug (without extension).
 * @returns Nothing.
 */
function exportJson(items: EventCommitment[], jsonType: string, slug: string): void {
  const envelope = {
    type: jsonType,
    version: 1,
    exportedAt: new Date().toISOString(),
    records: items.map(({ id: _id, createdAt: _ca, updatedAt: _ua, subItems, ...rest }) => ({
      ...rest,
      subItems: subItems.map(({ id: _sid, ...sub }) => sub),
    })),
  };
  downloadBlob(JSON.stringify(envelope, null, 2), `${slug}.json`, "application/json");
}

/**
 * Build the markdown content for a single event commitment.
 * @param item The event commitment.
 * @returns The markdown string for that one item.
 */
function itemToMarkdown(item: EventCommitment): string {
  let md = `# ${item.eventName}\n\n`;
  if (item.type) md += `**Type:** ${item.type}  \n`;
  if (item.started) md += `**Started:** ${item.started}  \n`;
  if (item.finished) md += `**Finished:** ${item.finished}  \n`;
  md += `**Required:** ${item.required ? "Yes" : "No"}  \n`;
  md += `**Done:** ${item.done ? "Yes" : "No"}  \n\n`;
  if (item.description) md += `${item.description}\n\n`;
  if (item.subItems.length > 0) {
    md += `## Sub-events\n\n`;
    for (const sub of item.subItems) {
      const check = sub.done ? "[x]" : "[ ]";
      md += `- ${check} **${sub.subEventName}**\n`;
      if (sub.description) md += `  - ${sub.description}\n`;
      if (sub.started || sub.finished)
        md += `  - ${sub.started ?? "—"} → ${sub.finished ?? "—"}\n`;
    }
    md += "\n";
  }
  return md;
}

/**
 * Export each event commitment as its own markdown file, bundled into a single
 * downloadable ZIP archive (one .md per item).
 * @param items The event commitments to export.
 * @param slug The base filename slug for the archive.
 * @returns Nothing.
 */
function exportMarkdown(items: EventCommitment[], slug: string): void {
  if (items.length === 0) return;
  const entries = items.map((item, i) => ({
    name: `${String(i + 1).padStart(2, "0")}-${slugifyFileName(item.eventName)}.md`,
    content: itemToMarkdown(item),
  }));
  const zip = createZip(entries);
  const url = URL.createObjectURL(zip);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Single event card with its full sub-item list and an add-sub-item form.
 * @param props The item, disabled state, and action callbacks.
 * @returns The rendered card.
 */
function EventCard({
  item,
  disabled,
  onEdit,
  onDelete,
  onPersist,
}: {
  item: EventCommitment;
  disabled: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onPersist: (item: EventCommitment) => void;
}): React.JSX.Element {
  const [draft, setDraft] = useState<SubDraft>(emptySubDraft());
  const [showSubForm, setShowSubForm] = useState(false);
  const [editingSubId, setEditingSubId] = useState<string | null>(null);

  /**
   * Save the sub-item draft (add new or update existing) and persist.
   * @returns Nothing.
   */
  function saveSubItem(): void {
    if (!draft.subEventName.trim()) return;
    const newSub: EventSubItem = {
      id: editingSubId ?? "temp-" + Date.now().toString(),
      subEventName: draft.subEventName.trim(),
      description: draft.description || null,
      started: draft.started || null,
      finished: draft.finished || null,
      done: draft.done,
    };
    const updatedSubs = editingSubId
      ? item.subItems.map((s) => (s.id === editingSubId ? newSub : s))
      : [...item.subItems, newSub];
    onPersist({ ...item, subItems: updatedSubs });
    setDraft(emptySubDraft());
    setShowSubForm(false);
    setEditingSubId(null);
  }

  /**
   * Load a sub-item into the draft form for editing.
   * @param sub The sub-item to edit.
   * @returns Nothing.
   */
  function startEditSub(sub: EventSubItem): void {
    setEditingSubId(sub.id);
    setDraft({
      subEventName: sub.subEventName,
      description: sub.description ?? "",
      started: sub.started ?? "",
      finished: sub.finished ?? "",
      done: sub.done,
    });
    setShowSubForm(true);
  }

  /**
   * Toggle a sub-item's done flag and persist.
   * @param subId The sub-item id.
   * @returns Nothing.
   */
  function toggleSub(subId: string): void {
    onPersist({
      ...item,
      subItems: item.subItems.map((s) =>
        s.id === subId ? { ...s, done: !s.done } : s,
      ),
    });
  }

  /**
   * Remove a sub-item and persist.
   * @param subId The sub-item id.
   * @returns Nothing.
   */
  function removeSub(subId: string): void {
    onPersist({ ...item, subItems: item.subItems.filter((s) => s.id !== subId) });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          {item.eventName}
          {item.done ? (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">Done</span>
          ) : null}
          {item.required ? (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">Required</span>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        {item.description ? <p>{item.description}</p> : null}
        <p className="text-xs text-muted-foreground">
          {item.type ? `${item.type} · ` : ""}
          {item.started ?? "—"} → {item.finished ?? "—"}
        </p>

        {/* Sub-items list */}
        {item.subItems.length > 0 ? (
          <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Sub-events
            </p>
            {item.subItems.map((sub) => (
              <div key={sub.id} className="flex flex-col gap-0.5 rounded-md bg-muted/40 p-2">
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={sub.done}
                    disabled={disabled}
                    onChange={() => toggleSub(sub.id)}
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className={sub.done ? "line-through text-muted-foreground" : "font-medium"}>
                      {sub.subEventName}
                    </span>
                    {sub.description ? (
                      <span className="text-xs text-muted-foreground">{sub.description}</span>
                    ) : null}
                    {(sub.started ?? sub.finished) ? (
                      <span className="text-xs text-muted-foreground">
                        {sub.started ?? "—"} → {sub.finished ?? "—"}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      disabled={disabled}
                      onClick={() => startEditSub(sub)}
                      aria-label="Edit sub-item"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      disabled={disabled}
                      onClick={() => removeSub(sub.id)}
                      aria-label="Remove sub-item"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {/* Add / edit sub-item form */}
        {showSubForm ? (
          <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {editingSubId ? "Edit sub-event" : "New sub-event"}
            </p>
            <div className="flex flex-col gap-1">
              <Label>Sub-event name *</Label>
              <Input
                value={draft.subEventName}
                onChange={(e) => setDraft((d) => ({ ...d, subEventName: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Description</Label>
              <Textarea
                rows={2}
                value={draft.description}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <Label>Started</Label>
                <Input
                  type="date"
                  value={draft.started}
                  onChange={(e) => setDraft((d) => ({ ...d, started: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label>Finished</Label>
                <Input
                  type="date"
                  value={draft.finished}
                  onChange={(e) => setDraft((d) => ({ ...d, finished: e.target.value }))}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.done}
                onChange={(e) => setDraft((d) => ({ ...d, done: e.target.checked }))}
              />
              Done
            </label>
            <div className="flex gap-2">
              <Button type="button" size="sm" disabled={disabled} onClick={saveSubItem}>
                {editingSubId ? "Save sub-event" : "Add sub-event"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowSubForm(false);
                  setEditingSubId(null);
                  setDraft(emptySubDraft());
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            disabled={disabled}
            onClick={() => setShowSubForm(true)}
          >
            <Plus className="h-4 w-4" />
            Add sub-event
          </Button>
        )}
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button variant="outline" size="sm" disabled={disabled} onClick={onEdit}>
          <Pencil className="h-4 w-4" />
          Edit
        </Button>
        <Button variant="destructive" size="sm" disabled={disabled} onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </CardFooter>
    </Card>
  );
}

/**
 * Reusable CRUD UI for event commitments (TDP Program Impact / Innovation Commitment).
 * Includes description card, sort controls, markdown export, and full sub-item forms.
 * @param props Page labels, initial items, and bound server actions.
 * @returns The rendered event-commitment manager.
 */
export function EventCommitmentClient({
  title,
  description,
  itemNoun,
  descriptionDetail,
  jsonType,
  initialItems,
  actions,
}: {
  title: string;
  description: string;
  itemNoun: string;
  descriptionDetail?: string;
  /** The type string to use in export envelopes and validate on import (e.g. "bcomm2"). */
  jsonType?: string;
  initialItems: EventCommitment[];
  actions: EventCommitmentActions;
}): React.JSX.Element {
  const [items, setItems] = useState<EventCommitment[]>(initialItems);
  const [form, setForm] = useState<EventFormState>(emptyEventForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("none");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [importOpen, setImportOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const sorted = useMemo<EventCommitment[]>(() => {
    if (sortField === "none") return items;
    return [...items].sort((a, b) => {
      const av = (sortField === "started" ? a.started : a.finished) ?? "";
      const bv = (sortField === "started" ? b.started : b.finished) ?? "";
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [items, sortField, sortDir]);

  /**
   * Persist an item with updated sub-items by calling the update server action.
   * @param item The full item with new sub-items applied.
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
          setItems((prev) => prev.map((ex) => (ex.id === item.id ? updated : ex)));
        }
      } catch {
        setError("Could not update sub-events.");
      }
    });
  }

  /**
   * Create or update an event from the form.
   * @param event The form submit event.
   * @returns Nothing.
   */
  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setError(null);
    if (!form.eventName.trim()) {
      setError(`${itemNoun} name is required.`);
      return;
    }
    const existing = editingId ? items.find((i) => i.id === editingId) : undefined;
    const subItems: EventSubItemInput[] = (existing?.subItems ?? []).map((sub) => ({
      subEventName: sub.subEventName,
      description: sub.description,
      started: sub.started,
      finished: sub.finished,
      done: sub.done,
    }));
    const payload = toInput(form, subItems);
    startTransition(async () => {
      try {
        if (editingId) {
          const updated = await actions.update(editingId, payload);
          if (updated) {
            setItems((prev) => prev.map((i) => (i.id === editingId ? updated : i)));
          }
          setEditingId(null);
        } else {
          const created = await actions.create(payload);
          setItems((prev) => [created, ...prev]);
        }
        setForm(emptyEventForm());
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
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /**
   * Delete an event item.
   * @param id The item id.
   * @returns Nothing.
   */
  function handleDelete(id: string): void {
    startTransition(async () => {
      try {
        await actions.remove(id);
        setItems((prev) => prev.filter((i) => i.id !== id));
      } catch {
        setError("Could not delete.");
      }
    });
  }

  const slug = title.toLowerCase().replace(/\s+/g, "-");

  /**
   * Bulk-import event commitments from parsed JSON records.
   * Calls the optional bulkCreate action then triggers a full server refresh.
   * @param records The raw records from the import modal.
   * @returns Nothing.
   */
  async function handleBulkImport(records: unknown[]): Promise<void> {
    if (!actions.bulkCreate) return;
    await actions.bulkCreate(records);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-2xl font-semibold">{title}</h1>
      <p className="mb-4 text-sm text-muted-foreground">{description}</p>

      {/* Description card */}
      <Card className="mb-6 border-l-4 border-l-primary bg-muted/40">
        <CardContent className="flex gap-3 pt-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-sm text-muted-foreground">
            {descriptionDetail ?? description}
          </p>
        </CardContent>
      </Card>

      {/* Toolbar */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium">Sort by</span>
        <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="started">Date started</SelectItem>
            <SelectItem value="finished">Date finished</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortDir} onValueChange={(v) => setSortDir(v as SortDir)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="asc">Ascending</SelectItem>
            <SelectItem value="desc">Descending</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto flex gap-2">
          {jsonType && actions.bulkCreate ? (
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" />
              Import JSON
            </Button>
          ) : null}
          {jsonType ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportJson(sorted, jsonType, slug)}
            >
              <Download className="h-4 w-4" />
              Export JSON
            </Button>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportMarkdown(sorted, slug)}
          >
            <Download className="h-4 w-4" />
            Export MD
          </Button>
        </div>
      </div>

      {/* Event form */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>
            {editingId ? `Edit ${itemNoun.toLowerCase()}` : `Add ${itemNoun.toLowerCase()}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="eventName">{itemNoun} name *</Label>
              <Input
                id="eventName"
                value={form.eventName}
                onChange={(e) => setForm((prev) => ({ ...prev, eventName: e.target.value }))}
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="type">Type</Label>
              <Input
                id="type"
                value={form.type}
                onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={2}
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <Label htmlFor="started">Started</Label>
                <Input
                  id="started"
                  type="date"
                  value={form.started}
                  onChange={(e) => setForm((prev) => ({ ...prev, started: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="finished">Finished</Label>
                <Input
                  id="finished"
                  type="date"
                  value={form.finished}
                  onChange={(e) => setForm((prev) => ({ ...prev, finished: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.required}
                  onChange={(e) => setForm((prev) => ({ ...prev, required: e.target.checked }))}
                />
                Required
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.done}
                  onChange={(e) => setForm((prev) => ({ ...prev, done: e.target.checked }))}
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
                  onClick={() => { setEditingId(null); setForm(emptyEventForm()); }}
                >
                  Cancel
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* List */}
      <div className="flex flex-col gap-3">
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing yet.</p>
        ) : (
          sorted.map((item) => (
            <EventCard
              key={item.id}
              item={item}
              disabled={isPending}
              onEdit={() => startEdit(item)}
              onDelete={() => handleDelete(item.id)}
              onPersist={persistItem}
            />
          ))
        )}
      </div>

      {jsonType && actions.bulkCreate ? (
        <JsonImportModal
          expectedType={jsonType}
          label={title}
          previewColumns={[
            { key: "eventName", label: "Event Name" },
            { key: "type", label: "Type" },
            { key: "started", label: "Started" },
          ]}
          onImport={handleBulkImport}
          open={importOpen}
          onClose={() => setImportOpen(false)}
        />
      ) : null}
    </div>
  );
}
