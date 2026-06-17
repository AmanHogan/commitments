"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { Trash2, Pencil, Plus, Download, Upload, Info } from "lucide-react";
import { JsonImportModal } from "@/components/json-import-modal";
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
  bulkCreateBusinessCommitments,
} from "./actions";

type SortField = "none" | "started" | "dateCompleted";
type SortDir = "asc" | "desc";

const STATUS_COLORS: Record<CommitmentStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  FAILED: "bg-red-100 text-red-800",
};

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
 * Trigger a browser download of a markdown string.
 * @param content The markdown text.
 * @param filename The base filename (without extension).
 * @returns Nothing.
 */
function downloadMarkdown(content: string, filename: string): void {
  downloadBlob(content, `${filename}.md`, "text/markdown; charset=utf-8");
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
 * Export business commitments as a JSON file matching the app's import schema.
 * @param commitments The commitments to export.
 * @returns Nothing.
 */
function exportJson(commitments: BusinessCommitmentOne[]): void {
  const envelope = {
    type: "bcomm1",
    version: 1,
    exportedAt: new Date().toISOString(),
    records: commitments.map(({ id: _id, createdAt: _ca, updatedAt: _ua, ...rest }) => rest),
  };
  downloadBlob(
    JSON.stringify(envelope, null, 2),
    "business-partner-impact.json",
    "application/json",
  );
}

/**
 * Generate a markdown export of all business commitments.
 * @param commitments The commitments to export.
 * @returns Nothing.
 */
function exportMarkdown(commitments: BusinessCommitmentOne[]): void {
  let md = "# Business Partner Impact Commitments\n\n";
  for (const c of commitments) {
    md += `## ${c.workItem}\n\n`;
    md += `**Status:** ${c.status.replace("_", " ")}  \n`;
    if (c.started) md += `**Started:** ${c.started}  \n`;
    if (c.dateCompleted) md += `**Completed:** ${c.dateCompleted}  \n`;
    if (c.applicationContext)
      md += `**Application Context:** ${c.applicationContext}  \n`;
    md += "\n";
    if (c.description) md += `${c.description}\n\n`;
    if (c.problemOpportunity)
      md += `**Problem / Opportunity:** ${c.problemOpportunity}\n\n`;
    if (c.whoBenefited) md += `**Who Benefited:** ${c.whoBenefited}\n\n`;
    if (c.impact) md += `**Impact:** ${c.impact}\n\n`;
    if (c.alignment) md += `**Alignment:** ${c.alignment}\n\n`;
    if (c.valueEntries.length > 0) {
      md += `### Value Entries\n\n`;
      for (const v of c.valueEntries) {
        md += `- **${v.label}:** ${v.value}\n`;
      }
      md += "\n";
    }
    if (c.statusNotes) md += `**Status Notes:** ${c.statusNotes}\n\n`;
    md += "---\n\n";
  }
  downloadMarkdown(md, "business-partner-impact");
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

/**
 * Interactive manager for Business Partner Impact commitments.
 * Includes description card, sort controls, markdown export, and full CRUD.
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
  const [sortField, setSortField] = useState<SortField>("none");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [importOpen, setImportOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const sorted = useMemo<BusinessCommitmentOne[]>(() => {
    if (sortField === "none") return commitments;
    return [...commitments].sort((a, b) => {
      const av = (sortField === "started" ? a.started : a.dateCompleted) ?? "";
      const bv = (sortField === "started" ? b.started : b.dateCompleted) ?? "";
      return sortDir === "asc"
        ? av.localeCompare(bv)
        : bv.localeCompare(av);
    });
  }, [commitments, sortField, sortDir]);

  /**
   * Add the staged value entry to the form.
   * @returns Nothing.
   */
  function addValueEntry(): void {
    if (!valueText.trim()) return;
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
   * @param c The commitment to edit.
   * @returns Nothing.
   */
  function startEdit(c: BusinessCommitmentOne): void {
    setEditingId(c.id);
    setForm({
      workItem: c.workItem,
      applicationContext: c.applicationContext ?? "",
      description: c.description ?? "",
      problemOpportunity: c.problemOpportunity ?? "",
      whoBenefited: c.whoBenefited ?? "",
      impact: c.impact ?? "",
      alignment: c.alignment ?? "",
      statusNotes: c.statusNotes ?? "",
      started: c.started ?? "",
      dateCompleted: c.dateCompleted ?? "",
      status: c.status,
      valueEntries: c.valueEntries,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  /**
   * Bulk-import business commitments from parsed JSON records.
   * @param records The raw records from the import modal.
   * @returns Nothing.
   */
  async function handleBulkImport(records: unknown[]): Promise<void> {
    await bulkCreateBusinessCommitments(records);
    const refreshed = await (await import("./actions")).getBusinessCommitments();
    setCommitments(refreshed);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Description card */}
      <Card className="border-l-4 border-l-primary bg-muted/40">
        <CardContent className="flex gap-3 pt-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="text-sm text-muted-foreground space-y-1">
            <p>
              <strong className="text-foreground">Section 1 — Business &amp; Project Work Impact</strong>{" "}
              (4,000 char limit, 3-5 items)
            </p>
            <p>
              Highlight your top 3-5 accomplishments that supported your BP team. Use STAR format in
              flowing paragraph form. Each entry needs scope, your specific contribution, and a
              quantified outcome — cost savings, time reduction, or efficiency gains. Lead results
              with a number. Use "I" language, not "we."
            </p>
            <a href="/dashboard/docs" className="inline-block pt-1 text-primary hover:underline text-xs font-medium">
              View full TDP writing guide →
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Toolbar: sort + export */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium">Sort by</span>
        <Select
          value={sortField}
          onValueChange={(v) => setSortField(v as SortField)}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="started">Date started</SelectItem>
            <SelectItem value="dateCompleted">Date completed</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={sortDir}
          onValueChange={(v) => setSortDir(v as SortDir)}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="asc">Ascending</SelectItem>
            <SelectItem value="desc">Descending</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setImportOpen(true)}
          >
            <Upload className="h-4 w-4" />
            Import JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportJson(sorted)}
          >
            <Download className="h-4 w-4" />
            Export JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportMarkdown(sorted)}
          >
            <Download className="h-4 w-4" />
            Export MD
          </Button>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>
            {editingId ? "Edit commitment" : "Add commitment"}
          </CardTitle>
        </CardHeader>
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
                  setForm((prev) => ({
                    ...prev,
                    whoBenefited: e.target.value,
                  }))
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
                  setForm((prev) => ({
                    ...prev,
                    statusNotes: e.target.value,
                  }))
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
                  {COMMITMENT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace("_", " ")}
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

            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}
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

      {/* List */}
      <div className="flex flex-col gap-3">
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">No commitments yet.</p>
        ) : (
          sorted.map((c) => (
            <Card key={c.id}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2">
                  {c.workItem}
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[c.status]}`}
                  >
                    {c.status.replace("_", " ")}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm">
                {c.applicationContext ? (
                  <p className="text-muted-foreground">{c.applicationContext}</p>
                ) : null}
                {c.description ? <p>{c.description}</p> : null}
                {c.problemOpportunity ? (
                  <div>
                    <span className="font-medium text-xs text-muted-foreground">
                      Problem / Opportunity
                    </span>
                    <p>{c.problemOpportunity}</p>
                  </div>
                ) : null}
                {c.whoBenefited ? (
                  <div>
                    <span className="font-medium text-xs text-muted-foreground">
                      Who benefited
                    </span>
                    <p>{c.whoBenefited}</p>
                  </div>
                ) : null}
                {c.impact ? (
                  <div>
                    <span className="font-medium text-xs text-muted-foreground">
                      Impact
                    </span>
                    <p>{c.impact}</p>
                  </div>
                ) : null}
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
                  Started: {c.started ?? "—"} · Completed:{" "}
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

      <JsonImportModal
        expectedType="bcomm1"
        label="Business Partner Impact"
        previewColumns={[
          { key: "workItem", label: "Work Item" },
          { key: "status", label: "Status" },
          { key: "started", label: "Started" },
        ]}
        onImport={handleBulkImport}
        open={importOpen}
        onClose={() => setImportOpen(false)}
      />
    </div>
  );
}
