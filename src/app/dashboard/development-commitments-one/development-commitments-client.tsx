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
  CreateDevelopmentCommitmentOneInput,
  DevelopmentCommitmentOne,
  LearningModule,
  LearningModuleInput,
} from "@/lib/types";
import {
  createDevelopmentCommitment,
  updateDevelopmentCommitment,
  deleteDevelopmentCommitment,
  bulkCreateDevelopmentCommitments,
  getDevelopmentCommitments,
} from "./actions";

type SortField = "none" | "itemDate" | "dateCompleted";
type SortDir = "asc" | "desc";

interface ItemFormState {
  itemName: string;
  description: string;
  itemDate: string;
  dateCompleted: string;
}

interface ModuleDraft {
  moduleName: string;
  type: string;
  hours: string;
  dateStarted: string;
  dateFinished: string;
  description: string;
  finished: boolean;
  required: boolean;
}

/**
 * Build an empty commitment item form state.
 * @returns A blank form.
 */
function emptyItemForm(): ItemFormState {
  return { itemName: "", description: "", itemDate: "", dateCompleted: "" };
}

/**
 * Build an empty module draft.
 * @returns A blank module draft.
 */
function emptyModuleDraft(): ModuleDraft {
  return {
    moduleName: "",
    type: "",
    hours: "",
    dateStarted: "",
    dateFinished: "",
    description: "",
    finished: false,
    required: false,
  };
}

/**
 * Convert a commitment plus modules into a server-action input payload.
 * @param itemForm The top-level commitment form state.
 * @param modules The learning modules to attach.
 * @returns The input payload.
 */
function toInput(
  itemForm: ItemFormState,
  modules: LearningModuleInput[],
): CreateDevelopmentCommitmentOneInput {
  return {
    itemName: itemForm.itemName.trim(),
    description: itemForm.description || null,
    itemDate: itemForm.itemDate || null,
    dateCompleted: itemForm.dateCompleted || null,
    modules,
  };
}

/**
 * Convert a LearningModule into a LearningModuleInput for persistence.
 * @param mod The module.
 * @returns The input shape.
 */
function moduleToInput(mod: LearningModule): LearningModuleInput {
  return {
    moduleName: mod.moduleName,
    type: mod.type,
    hours: mod.hours,
    dateStarted: mod.dateStarted,
    dateFinished: mod.dateFinished,
    finished: mod.finished,
    required: mod.required,
    description: mod.description,
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
 * Export development commitments as a JSON file matching the app's import schema.
 * @param items The commitments to export.
 * @returns Nothing.
 */
function exportJson(items: DevelopmentCommitmentOne[]): void {
  const envelope = {
    type: "dcomm1",
    version: 1,
    exportedAt: new Date().toISOString(),
    records: items.map(({ id: _id, createdAt: _ca, updatedAt: _ua, modules, ...rest }) => ({
      ...rest,
      modules: modules.map(({ id: _mid, ...mod }) => mod),
    })),
  };
  downloadBlob(JSON.stringify(envelope, null, 2), "development-commitments.json", "application/json");
}

/**
 * Build the markdown content for a single development commitment.
 * @param item The commitment.
 * @returns The markdown string for that one item.
 */
function itemToMarkdown(item: DevelopmentCommitmentOne): string {
  let md = `# ${item.itemName}\n\n`;
  if (item.itemDate) md += `**Date:** ${item.itemDate}  \n`;
  if (item.dateCompleted) md += `**Completed:** ${item.dateCompleted}  \n`;
  md += "\n";
  if (item.description) md += `${item.description}\n\n`;
  if (item.modules.length > 0) {
    md += `## Modules\n\n`;
    for (const mod of item.modules) {
      const check = mod.finished ? "[x]" : "[ ]";
      md += `- ${check} **${mod.moduleName}**`;
      if (mod.hours != null) md += ` (${mod.hours}h)`;
      md += `  \n`;
      if (mod.description) md += `  > ${mod.description}  \n`;
      if (mod.dateStarted || mod.dateFinished)
        md += `  Started: ${mod.dateStarted ?? "—"} · Finished: ${mod.dateFinished ?? "—"}  \n`;
      if (mod.type) md += `  Type: ${mod.type}  \n`;
      if (mod.required) md += `  Required  \n`;
      md += "\n";
    }
  }
  return md;
}

/**
 * Export each development commitment as its own markdown file, bundled into a
 * single downloadable ZIP archive (one .md per item).
 * @param items The commitments to export.
 * @returns Nothing.
 */
function exportMarkdown(items: DevelopmentCommitmentOne[]): void {
  if (items.length === 0) return;
  const entries = items.map((item, i) => ({
    name: `${String(i + 1).padStart(2, "0")}-${slugifyFileName(item.itemName)}.md`,
    content: itemToMarkdown(item),
  }));
  const url = URL.createObjectURL(createZip(entries));
  const a = document.createElement("a");
  a.href = url;
  a.download = "development-commitments.zip";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Interactive manager for Development Commitment items and their learning modules.
 * Renders a sortable table; creating or opening a row launches a modal that manages
 * the commitment and its modules together.
 * @param props Contains the server-loaded `initialItems`.
 * @returns The rendered client UI.
 */
export function DevelopmentCommitmentsClient({
  initialItems,
}: {
  initialItems: DevelopmentCommitmentOne[];
}): React.JSX.Element {
  const [items, setItems] = useState<DevelopmentCommitmentOne[]>(initialItems);
  const [itemForm, setItemForm] = useState<ItemFormState>(emptyItemForm());
  const [modules, setModules] = useState<LearningModule[]>([]);
  const [moduleDraft, setModuleDraft] = useState<ModuleDraft>(emptyModuleDraft());
  const [showModForm, setShowModForm] = useState(false);
  const [editingModId, setEditingModId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>("none");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [importOpen, setImportOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const sorted = useMemo<DevelopmentCommitmentOne[]>(() => {
    if (sortField === "none") return items;
    return [...items].sort((a, b) => {
      const av = (sortField === "itemDate" ? a.itemDate : a.dateCompleted) ?? "";
      const bv = (sortField === "itemDate" ? b.itemDate : b.dateCompleted) ?? "";
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [items, sortField, sortDir]);

  /**
   * Reset the module draft form back to a blank, hidden state.
   * @returns Nothing.
   */
  function resetModuleDraft(): void {
    setModuleDraft(emptyModuleDraft());
    setShowModForm(false);
    setEditingModId(null);
  }

  /**
   * Open the modal in create mode with a blank form.
   * @returns Nothing.
   */
  function openCreate(): void {
    setEditingId(null);
    setItemForm(emptyItemForm());
    setModules([]);
    resetModuleDraft();
    setError(null);
    setModalOpen(true);
  }

  /**
   * Open the modal in edit mode populated from a commitment.
   * @param item The item to edit.
   * @returns Nothing.
   */
  function openEdit(item: DevelopmentCommitmentOne): void {
    setEditingId(item.id);
    setItemForm({
      itemName: item.itemName,
      description: item.description ?? "",
      itemDate: item.itemDate ?? "",
      dateCompleted: item.dateCompleted ?? "",
    });
    setModules(item.modules);
    resetModuleDraft();
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
    setItemForm(emptyItemForm());
    setModules([]);
    resetModuleDraft();
    setError(null);
  }

  /**
   * Save the module draft into modal-local state (add new or update existing).
   * @returns Nothing.
   */
  function saveModule(): void {
    if (!moduleDraft.moduleName.trim()) return;
    const newMod: LearningModule = {
      id: editingModId ?? "temp-" + Date.now().toString(),
      moduleName: moduleDraft.moduleName.trim(),
      type: moduleDraft.type || null,
      hours: moduleDraft.hours ? Number(moduleDraft.hours) : null,
      dateStarted: moduleDraft.dateStarted || null,
      dateFinished: moduleDraft.dateFinished || null,
      description: moduleDraft.description || null,
      finished: moduleDraft.finished,
      required: moduleDraft.required,
    };
    setModules((prev) =>
      editingModId ? prev.map((m) => (m.id === editingModId ? newMod : m)) : [...prev, newMod],
    );
    resetModuleDraft();
  }

  /**
   * Load a module into the draft form for editing.
   * @param mod The module to edit.
   * @returns Nothing.
   */
  function startEditModule(mod: LearningModule): void {
    setEditingModId(mod.id);
    setModuleDraft({
      moduleName: mod.moduleName,
      type: mod.type ?? "",
      hours: mod.hours?.toString() ?? "",
      dateStarted: mod.dateStarted ?? "",
      dateFinished: mod.dateFinished ?? "",
      description: mod.description ?? "",
      finished: mod.finished,
      required: mod.required,
    });
    setShowModForm(true);
  }

  /**
   * Toggle a module's finished flag in modal-local state.
   * @param modId The module id.
   * @returns Nothing.
   */
  function toggleModule(modId: string): void {
    setModules((prev) =>
      prev.map((m) => (m.id === modId ? { ...m, finished: !m.finished } : m)),
    );
  }

  /**
   * Remove a module from modal-local state.
   * @param modId The module id.
   * @returns Nothing.
   */
  function removeModule(modId: string): void {
    setModules((prev) => prev.filter((m) => m.id !== modId));
  }

  /**
   * Create or update the commitment (with its modules) from the form, then close.
   * @param event The form submit event.
   * @returns Nothing.
   */
  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setError(null);
    if (!itemForm.itemName.trim()) {
      setError("Name is required.");
      return;
    }
    const payload = toInput(itemForm, modules.map(moduleToInput));
    startTransition(async () => {
      try {
        if (editingId) {
          const updated = await updateDevelopmentCommitment(editingId, payload);
          if (updated) {
            setItems((prev) => prev.map((i) => (i.id === editingId ? updated : i)));
          }
        } else {
          const created = await createDevelopmentCommitment(payload);
          setItems((prev) => [created, ...prev]);
        }
        closeModal();
      } catch {
        setError("Could not save commitment.");
      }
    });
  }

  /**
   * Delete a commitment and close the modal if it was open for that record.
   * @param id The commitment id.
   * @returns Nothing.
   */
  function handleDelete(id: string): void {
    startTransition(async () => {
      try {
        await deleteDevelopmentCommitment(id);
        setItems((prev) => prev.filter((item) => item.id !== id));
        if (editingId === id) closeModal();
      } catch {
        setError("Could not delete commitment.");
      }
    });
  }

  /**
   * Bulk-import development commitments from parsed JSON records.
   * @param records The raw records from the import modal.
   * @returns Nothing.
   */
  async function handleBulkImport(records: unknown[]): Promise<void> {
    await bulkCreateDevelopmentCommitments(records);
    const refreshed = await getDevelopmentCommitments();
    setItems(refreshed);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Description card */}
      <Card className="border-l-4 border-l-primary bg-muted/40">
        <CardContent className="flex gap-3 pt-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="text-sm text-muted-foreground space-y-1">
            <p>
              <strong className="text-foreground">Section 3 — Continuous Learning &amp; Development</strong>{" "}
              (4,000 char limit, 2-4 items)
            </p>
            <p>
              Write in paragraph form (NOT STAR). Highlight 2-4 accomplishments showcasing skills
              growth. For each: track hours invested, describe what you learned, show the arc from
              learning to application to business impact. Target 30+ hours total. Always include
              hours per module.
            </p>
            <a href="/dashboard/docs" className="inline-block pt-1 text-primary hover:underline text-xs font-medium">
              View full TDP writing guide →
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          New commitment
        </Button>

        <span className="ml-2 text-sm font-medium">Sort by</span>
        <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="itemDate">Date started</SelectItem>
            <SelectItem value="dateCompleted">Date completed</SelectItem>
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
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" />
            Import JSON
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportJson(sorted)}>
            <Download className="h-4 w-4" />
            Export JSON
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportMarkdown(sorted)}>
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
            <span className="font-medium text-foreground">New commitment</span> to add one.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left">
              <tr>
                <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                  Name
                </th>
                <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                  Modules
                </th>
                <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                  Started
                </th>
                <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                  Completed
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((item) => {
                const doneMods = item.modules.filter((m) => m.finished).length;
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
                    aria-label={`Open ${item.itemName}`}
                    className="cursor-pointer border-t border-border transition hover:bg-muted/50 focus:bg-muted/50 focus:outline-none"
                  >
                    <td className="max-w-xs truncate px-4 py-3 font-medium">
                      {item.itemName}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {item.modules.length > 0
                        ? `${doneMods}/${item.modules.length}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {item.itemDate ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {item.dateCompleted ?? "—"}
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
                {editingId ? "Edit commitment" : "New commitment"}
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
                  <Label htmlFor="itemName">Name *</Label>
                  <Input
                    id="itemName"
                    value={itemForm.itemName}
                    onChange={(e) => setItemForm((prev) => ({ ...prev, itemName: e.target.value }))}
                    placeholder="e.g. AWS Solutions Architect"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="itemDesc">Description</Label>
                  <Textarea
                    id="itemDesc"
                    rows={2}
                    value={itemForm.description}
                    onChange={(e) => setItemForm((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="What you learned and how it applies to your work"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="itemDate">Date started</Label>
                    <Input
                      id="itemDate"
                      type="date"
                      value={itemForm.itemDate}
                      onChange={(e) => setItemForm((prev) => ({ ...prev, itemDate: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="dateCompleted">Date completed</Label>
                    <Input
                      id="dateCompleted"
                      type="date"
                      value={itemForm.dateCompleted}
                      onChange={(e) => setItemForm((prev) => ({ ...prev, dateCompleted: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Modules manager */}
                <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Modules
                  </span>
                  {modules.map((mod) => (
                    <div key={mod.id} className="flex items-start gap-2 rounded-md bg-muted/40 p-2">
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={mod.finished}
                        onChange={() => toggleModule(mod.id)}
                      />
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className={mod.finished ? "line-through text-muted-foreground" : "font-medium"}>
                          {mod.moduleName}
                          {mod.hours != null ? ` (${mod.hours}h)` : ""}
                          {mod.required ? (
                            <span className="ml-1 text-xs text-muted-foreground">[required]</span>
                          ) : null}
                        </span>
                        {mod.description ? (
                          <span className="text-xs text-muted-foreground">{mod.description}</span>
                        ) : null}
                        {(mod.dateStarted ?? mod.dateFinished) ? (
                          <span className="text-xs text-muted-foreground">
                            {mod.dateStarted ?? "—"} → {mod.dateFinished ?? "—"}
                          </span>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => startEditModule(mod)}
                          aria-label="Edit module"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => removeModule(mod.id)}
                          aria-label="Remove module"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {showModForm ? (
                    <div className="flex flex-col gap-2 rounded-md border border-border p-2">
                      <div className="flex flex-col gap-1">
                        <Label>Module name *</Label>
                        <Input
                          value={moduleDraft.moduleName}
                          onChange={(e) => setModuleDraft((d) => ({ ...d, moduleName: e.target.value }))}
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <Label>Description</Label>
                        <Textarea
                          rows={2}
                          value={moduleDraft.description}
                          onChange={(e) => setModuleDraft((d) => ({ ...d, description: e.target.value }))}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col gap-1">
                          <Label>Type</Label>
                          <Input
                            value={moduleDraft.type}
                            onChange={(e) => setModuleDraft((d) => ({ ...d, type: e.target.value }))}
                            placeholder="e.g. Course"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <Label>Hours</Label>
                          <Input
                            type="number"
                            value={moduleDraft.hours}
                            onChange={(e) => setModuleDraft((d) => ({ ...d, hours: e.target.value }))}
                            min={0}
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <Label>Date started</Label>
                          <Input
                            type="date"
                            value={moduleDraft.dateStarted}
                            onChange={(e) => setModuleDraft((d) => ({ ...d, dateStarted: e.target.value }))}
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <Label>Date completed</Label>
                          <Input
                            type="date"
                            value={moduleDraft.dateFinished}
                            onChange={(e) => setModuleDraft((d) => ({ ...d, dateFinished: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={moduleDraft.finished}
                            onChange={(e) => setModuleDraft((d) => ({ ...d, finished: e.target.checked }))}
                          />
                          Finished
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={moduleDraft.required}
                            onChange={(e) => setModuleDraft((d) => ({ ...d, required: e.target.checked }))}
                          />
                          Required
                        </label>
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" size="sm" onClick={saveModule}>
                          {editingModId ? "Save module" : "Add module"}
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={resetModuleDraft}>
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
                      onClick={() => setShowModForm(true)}
                    >
                      <Plus className="h-4 w-4" />
                      Add module
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
                    {editingId ? "Save changes" : "Add"}
                  </Button>
                </div>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <JsonImportModal
        expectedType="dcomm1"
        label="Development Commitments"
        previewColumns={[
          { key: "itemName", label: "Item Name" },
          { key: "itemDate", label: "Date" },
          { key: "dateCompleted", label: "Completed" },
        ]}
        onImport={handleBulkImport}
        open={importOpen}
        onClose={() => setImportOpen(false)}
      />
    </div>
  );
}
