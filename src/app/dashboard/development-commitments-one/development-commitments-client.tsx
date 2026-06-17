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
 * Trigger a browser download of a markdown string.
 * @param content The markdown text.
 * @param filename The base filename (without extension).
 * @returns Nothing.
 */
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
 * Single commitment card with its learning modules and an add/edit module form.
 * @param props The item and its action callbacks.
 * @returns The rendered card.
 */
function CommitmentCard({
  item,
  disabled,
  onPersist,
  onDelete,
  onEditItem,
}: {
  item: DevelopmentCommitmentOne;
  disabled: boolean;
  onPersist: (item: DevelopmentCommitmentOne) => void;
  onDelete: () => void;
  onEditItem: (item: DevelopmentCommitmentOne) => void;
}): React.JSX.Element {
  const [draft, setDraft] = useState<ModuleDraft>(emptyModuleDraft());
  const [editingModId, setEditingModId] = useState<string | null>(null);
  const [showModForm, setShowModForm] = useState(false);

  /**
   * Save the module draft (add new or update existing) and persist.
   * @returns Nothing.
   */
  function saveModule(): void {
    if (!draft.moduleName.trim()) return;
    const newMod: LearningModule = {
      id: editingModId ?? "temp-" + Date.now().toString(),
      moduleName: draft.moduleName.trim(),
      type: draft.type || null,
      hours: draft.hours ? Number(draft.hours) : null,
      dateStarted: draft.dateStarted || null,
      dateFinished: draft.dateFinished || null,
      description: draft.description || null,
      finished: draft.finished,
      required: draft.required,
    };
    const updatedMods = editingModId
      ? item.modules.map((m) => (m.id === editingModId ? newMod : m))
      : [...item.modules, newMod];
    onPersist({ ...item, modules: updatedMods });
    setDraft(emptyModuleDraft());
    setShowModForm(false);
    setEditingModId(null);
  }

  /**
   * Load a module into the draft form for editing.
   * @param mod The module to edit.
   * @returns Nothing.
   */
  function startEditModule(mod: LearningModule): void {
    setEditingModId(mod.id);
    setDraft({
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle>{item.itemName}</CardTitle>
            {item.description ? (
              <p className="mt-0.5 text-sm text-muted-foreground">{item.description}</p>
            ) : null}
            <p className="mt-0.5 text-xs text-muted-foreground">
              {item.itemDate ? `Started: ${item.itemDate}` : ""}
              {item.itemDate && item.dateCompleted ? " · " : ""}
              {item.dateCompleted ? `Completed: ${item.dateCompleted}` : ""}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={() => onEditItem(item)}
            aria-label="Edit commitment"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        {/* Module list */}
        {item.modules.length > 0 ? (
          <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Modules
            </p>
            {item.modules.map((mod) => (
              <div key={mod.id} className="flex flex-col gap-0.5 rounded-md bg-muted/40 p-2">
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-0.5"
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
                      variant="ghost"
                      size="icon-xs"
                      disabled={disabled}
                      onClick={() => startEditModule(mod)}
                      aria-label="Edit module"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
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
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {/* Module add/edit form */}
        {showModForm ? (
          <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {editingModId ? "Edit module" : "New module"}
            </p>
            <div className="flex flex-col gap-1">
              <Label>Module name *</Label>
              <Input
                value={draft.moduleName}
                onChange={(e) => setDraft((d) => ({ ...d, moduleName: e.target.value }))}
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
                <Label>Type</Label>
                <Input
                  value={draft.type}
                  onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value }))}
                  placeholder="e.g. Course"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label>Hours</Label>
                <Input
                  type="number"
                  value={draft.hours}
                  onChange={(e) => setDraft((d) => ({ ...d, hours: e.target.value }))}
                  min={0}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label>Date started</Label>
                <Input
                  type="date"
                  value={draft.dateStarted}
                  onChange={(e) => setDraft((d) => ({ ...d, dateStarted: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label>Date completed</Label>
                <Input
                  type="date"
                  value={draft.dateFinished}
                  onChange={(e) => setDraft((d) => ({ ...d, dateFinished: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.finished}
                  onChange={(e) => setDraft((d) => ({ ...d, finished: e.target.checked }))}
                />
                Finished
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.required}
                  onChange={(e) => setDraft((d) => ({ ...d, required: e.target.checked }))}
                />
                Required
              </label>
            </div>
            <div className="flex gap-2">
              <Button type="button" size="sm" disabled={disabled} onClick={saveModule}>
                {editingModId ? "Save module" : "Add module"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowModForm(false);
                  setEditingModId(null);
                  setDraft(emptyModuleDraft());
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
            onClick={() => setShowModForm(true)}
          >
            <Plus className="h-4 w-4" />
            Add module
          </Button>
        )}
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

/**
 * Interactive manager for Development Commitment items and their learning modules.
 * Includes description card, sort controls, markdown export, and full module CRUD.
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
  const [editingId, setEditingId] = useState<string | null>(null);
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
   * Create a new development commitment from the form.
   * @param event The form submit event.
   * @returns Nothing.
   */
  function handleCreate(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setError(null);
    if (!itemForm.itemName.trim()) {
      setError("Name is required.");
      return;
    }
    if (editingId) {
      // Update the top-level item metadata (name, dates) while keeping existing modules.
      const existing = items.find((i) => i.id === editingId);
      if (!existing) return;
      const payload = toInput(itemForm, existing.modules.map(moduleToInput));
      startTransition(async () => {
        try {
          const updated = await updateDevelopmentCommitment(editingId, payload);
          if (updated) {
            setItems((prev) => prev.map((i) => (i.id === editingId ? updated : i)));
          }
          setEditingId(null);
          setItemForm(emptyItemForm());
        } catch {
          setError("Could not update commitment.");
        }
      });
      return;
    }
    startTransition(async () => {
      try {
        const created = await createDevelopmentCommitment(
          toInput(itemForm, []),
        );
        setItems((prev) => [created, ...prev]);
        setItemForm(emptyItemForm());
      } catch {
        setError("Could not create commitment.");
      }
    });
  }

  /**
   * Load a commitment's metadata into the form for editing.
   * @param item The item to edit.
   * @returns Nothing.
   */
  function startEditItem(item: DevelopmentCommitmentOne): void {
    setEditingId(item.id);
    setItemForm({
      itemName: item.itemName,
      description: item.description ?? "",
      itemDate: item.itemDate ?? "",
      dateCompleted: item.dateCompleted ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /**
   * Persist a commitment with updated modules by calling the update server action.
   * @param item The full commitment with new modules applied.
   * @returns Nothing.
   */
  function persist(item: DevelopmentCommitmentOne): void {
    const payload = toInput(
      { itemName: item.itemName, description: item.description ?? "", itemDate: item.itemDate ?? "", dateCompleted: item.dateCompleted ?? "" },
      item.modules.map(moduleToInput),
    );
    startTransition(async () => {
      try {
        const updated = await updateDevelopmentCommitment(item.id, payload);
        if (updated) {
          setItems((prev) => prev.map((ex) => (ex.id === item.id ? updated : ex)));
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
        <span className="text-sm font-medium">Sort by</span>
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

      {/* Commitment form */}
      <Card>
        <CardHeader>
          <CardTitle>
            {editingId ? "Edit commitment" : "Add commitment"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="flex flex-col gap-3">
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
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex gap-2">
              <Button type="submit" disabled={isPending}>
                {editingId ? "Save changes" : "Add"}
              </Button>
              {editingId ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setEditingId(null); setItemForm(emptyItemForm()); }}
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
            <CommitmentCard
              key={item.id}
              item={item}
              disabled={isPending}
              onPersist={persist}
              onDelete={() => handleDelete(item.id)}
              onEditItem={startEditItem}
            />
          ))
        )}
      </div>

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
