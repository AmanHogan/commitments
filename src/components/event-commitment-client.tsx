"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "radix-ui";
import { Trash2, Plus, Pencil, Download, Upload, Info, X } from "lucide-react";
import { JsonImportModal } from "@/components/json-import-modal";
import { createZip, slugifyFileName } from "@/lib/zip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
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
  applicationContext: string;
  description: string;
  impact: string;
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
  return { eventName: "", type: "", applicationContext: "", description: "", impact: "", started: "", finished: "", required: false, done: false };
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
    applicationContext: form.applicationContext || null,
    description: form.description || null,
    impact: form.impact || null,
    started: form.started || null,
    finished: form.finished || null,
    required: form.required,
    done: form.done,
    subItems,
  };
}

/**
 * Map a stored/temp sub-item to its persistence input shape (dropping the id).
 * @param sub The sub-item.
 * @returns The sub-item input.
 */
function subToInput(sub: EventSubItem): EventSubItemInput {
  return {
    subEventName: sub.subEventName,
    description: sub.description,
    started: sub.started,
    finished: sub.finished,
    done: sub.done,
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
  if (item.applicationContext)
    md += `**Application Context:** ${item.applicationContext}\n\n`;
  if (item.description) md += `${item.description}\n\n`;
  if (item.impact) md += `**Impact:** ${item.impact}\n\n`;
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
 * Status pills for an event row (done / in-progress and required).
 * @param props The event item.
 * @returns The rendered badges.
 */
function EventStatusBadges({ item }: { item: EventCommitment }): React.JSX.Element {
  return (
    <div className="flex flex-wrap gap-1">
      {item.done ? (
        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
          Done
        </span>
      ) : (
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
          In progress
        </span>
      )}
      {item.required ? (
        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">
          Required
        </span>
      ) : null}
    </div>
  );
}

/**
 * Reusable CRUD UI for event commitments (TDP Program Impact / Innovation Commitment).
 * Renders a sortable table; creating or opening a row launches a modal that manages
 * the event and its sub-events together.
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
  const [subItems, setSubItems] = useState<EventSubItem[]>([]);
  const [subDraft, setSubDraft] = useState<SubDraft>(emptySubDraft());
  const [showSubForm, setShowSubForm] = useState(false);
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
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

  const slug = title.toLowerCase().replace(/\s+/g, "-");

  /**
   * Reset the sub-event draft form back to a blank, hidden state.
   * @returns Nothing.
   */
  function resetSubDraft(): void {
    setSubDraft(emptySubDraft());
    setShowSubForm(false);
    setEditingSubId(null);
  }

  /**
   * Open the modal in create mode with a blank form.
   * @returns Nothing.
   */
  function openCreate(): void {
    setEditingId(null);
    setForm(emptyEventForm());
    setSubItems([]);
    resetSubDraft();
    setError(null);
    setModalOpen(true);
  }

  /**
   * Open the modal in edit mode populated from an event item.
   * @param item The item to edit.
   * @returns Nothing.
   */
  function openEdit(item: EventCommitment): void {
    setEditingId(item.id);
    setForm({
      eventName: item.eventName,
      type: item.type ?? "",
      applicationContext: item.applicationContext ?? "",
      description: item.description ?? "",
      impact: item.impact ?? "",
      started: item.started ?? "",
      finished: item.finished ?? "",
      required: item.required,
      done: item.done,
    });
    setSubItems(item.subItems);
    resetSubDraft();
    setError(null);
    setModalOpen(true);
  }

  /**
   * Close the modal and reset transient form state.
   * @returns Nothing.
   */
  function closeModal(): void {
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyEventForm());
    setSubItems([]);
    resetSubDraft();
    setError(null);
  }

  /**
   * Save the sub-event draft into modal-local state (add new or update existing).
   * @returns Nothing.
   */
  function saveSubItem(): void {
    if (!subDraft.subEventName.trim()) return;
    const newSub: EventSubItem = {
      id: editingSubId ?? "temp-" + Date.now().toString(),
      subEventName: subDraft.subEventName.trim(),
      description: subDraft.description || null,
      started: subDraft.started || null,
      finished: subDraft.finished || null,
      done: subDraft.done,
    };
    setSubItems((prev) =>
      editingSubId ? prev.map((s) => (s.id === editingSubId ? newSub : s)) : [...prev, newSub],
    );
    resetSubDraft();
  }

  /**
   * Load a sub-event into the draft form for editing.
   * @param sub The sub-item to edit.
   * @returns Nothing.
   */
  function startEditSub(sub: EventSubItem): void {
    setEditingSubId(sub.id);
    setSubDraft({
      subEventName: sub.subEventName,
      description: sub.description ?? "",
      started: sub.started ?? "",
      finished: sub.finished ?? "",
      done: sub.done,
    });
    setShowSubForm(true);
  }

  /**
   * Toggle a sub-event's done flag in modal-local state.
   * @param subId The sub-item id.
   * @returns Nothing.
   */
  function toggleSub(subId: string): void {
    setSubItems((prev) =>
      prev.map((s) => (s.id === subId ? { ...s, done: !s.done } : s)),
    );
  }

  /**
   * Remove a sub-event from modal-local state.
   * @param subId The sub-item id.
   * @returns Nothing.
   */
  function removeSub(subId: string): void {
    setSubItems((prev) => prev.filter((s) => s.id !== subId));
  }

  /**
   * Create or update the event (with its sub-events) from the form, then close.
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
    const payload = toInput(form, subItems.map(subToInput));
    startTransition(async () => {
      try {
        if (editingId) {
          const updated = await actions.update(editingId, payload);
          if (updated) {
            setItems((prev) => prev.map((i) => (i.id === editingId ? updated : i)));
          }
        } else {
          const created = await actions.create(payload);
          setItems((prev) => [created, ...prev]);
        }
        closeModal();
      } catch {
        setError("Could not save.");
      }
    });
  }

  /**
   * Delete an event item and close the modal if it was open for that record.
   * @param id The item id.
   * @returns Nothing.
   */
  function handleDelete(id: string): void {
    startTransition(async () => {
      try {
        await actions.remove(id);
        setItems((prev) => prev.filter((i) => i.id !== id));
        if (editingId === id) closeModal();
      } catch {
        setError("Could not delete.");
      }
    });
  }

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
    <div className="mx-auto max-w-4xl">
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
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          New {itemNoun.toLowerCase()}
        </Button>

        <span className="ml-2 text-sm font-medium">Sort by</span>
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

      {/* Table */}
      {sorted.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Nothing yet. Click{" "}
            <span className="font-medium text-foreground">New {itemNoun.toLowerCase()}</span> to add one.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left">
              <tr>
                <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                  {itemNoun} name
                </th>
                <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                  Started
                </th>
                <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                  Finished
                </th>
                <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                  Sub-events
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((item) => {
                const doneSubs = item.subItems.filter((s) => s.done).length;
                return (
                  <tr
                    key={item.id}
                    onClick={() => openEdit(item)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openEdit(item);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`Open ${item.eventName}`}
                    className="cursor-pointer border-t border-border transition hover:bg-muted/50 focus:bg-muted/50 focus:outline-none"
                  >
                    <td className="max-w-xs truncate px-4 py-3 font-medium">
                      {item.eventName}
                    </td>
                    <td className="px-4 py-3">
                      <EventStatusBadges item={item} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {item.started ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {item.finished ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {item.subItems.length > 0
                        ? `${doneSubs}/${item.subItems.length}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          aria-label="Edit"
                          disabled={isPending}
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit(item);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          aria-label="Delete"
                          disabled={isPending}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(item.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit modal */}
      <Dialog.Root open={modalOpen} onOpenChange={(v) => { if (!v) closeModal(); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
          <Dialog.Content
            className="fixed left-1/2 top-1/2 z-50 flex max-h-[88vh] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-border bg-card shadow-xl focus:outline-none"
            aria-describedby={undefined}
          >
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <Dialog.Title className="text-lg font-semibold">
                {editingId ? `Edit ${itemNoun.toLowerCase()}` : `New ${itemNoun.toLowerCase()}`}
              </Dialog.Title>
              <Dialog.Close asChild>
                <Button variant="ghost" size="icon-xs" aria-label="Close">
                  <X className="h-4 w-4" />
                </Button>
              </Dialog.Close>
            </div>

            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
              <div className="flex flex-col gap-3 overflow-y-auto px-6 py-4">
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
                  <Label htmlFor="applicationContext">Application context</Label>
                  <Textarea
                    id="applicationContext"
                    rows={2}
                    value={form.applicationContext}
                    onChange={(e) => setForm((prev) => ({ ...prev, applicationContext: e.target.value }))}
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
                <div className="flex flex-col gap-1">
                  <Label htmlFor="impact">Impact</Label>
                  <Textarea
                    id="impact"
                    rows={2}
                    value={form.impact}
                    onChange={(e) => setForm((prev) => ({ ...prev, impact: e.target.value }))}
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

                {/* Sub-events manager */}
                <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Sub-events
                  </span>
                  {subItems.map((sub) => (
                    <div key={sub.id} className="flex items-start gap-2 rounded-md bg-muted/40 p-2">
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={sub.done}
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
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => startEditSub(sub)}
                          aria-label="Edit sub-item"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => removeSub(sub.id)}
                          aria-label="Remove sub-item"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {showSubForm ? (
                    <div className="flex flex-col gap-2 rounded-md border border-border p-2">
                      <div className="flex flex-col gap-1">
                        <Label>Sub-event name *</Label>
                        <Input
                          value={subDraft.subEventName}
                          onChange={(e) => setSubDraft((d) => ({ ...d, subEventName: e.target.value }))}
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <Label>Description</Label>
                        <Textarea
                          rows={2}
                          value={subDraft.description}
                          onChange={(e) => setSubDraft((d) => ({ ...d, description: e.target.value }))}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col gap-1">
                          <Label>Started</Label>
                          <Input
                            type="date"
                            value={subDraft.started}
                            onChange={(e) => setSubDraft((d) => ({ ...d, started: e.target.value }))}
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <Label>Finished</Label>
                          <Input
                            type="date"
                            value={subDraft.finished}
                            onChange={(e) => setSubDraft((d) => ({ ...d, finished: e.target.value }))}
                          />
                        </div>
                      </div>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={subDraft.done}
                          onChange={(e) => setSubDraft((d) => ({ ...d, done: e.target.checked }))}
                        />
                        Done
                      </label>
                      <div className="flex gap-2">
                        <Button type="button" size="sm" onClick={saveSubItem}>
                          {editingSubId ? "Save sub-event" : "Add sub-event"}
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={resetSubDraft}>
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
                      onClick={() => setShowSubForm(true)}
                    >
                      <Plus className="h-4 w-4" />
                      Add sub-event
                    </Button>
                  )}
                </div>

                {error ? <p className="text-sm text-destructive">{error}</p> : null}
              </div>

              <div className="flex items-center gap-2 border-t border-border px-6 py-4">
                {editingId ? (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={isPending}
                    onClick={() => handleDelete(editingId)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                ) : null}
                <div className="ml-auto flex gap-2">
                  <Button type="button" variant="outline" onClick={closeModal} disabled={isPending}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    {editingId ? "Save changes" : `Add ${itemNoun.toLowerCase()}`}
                  </Button>
                </div>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

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
