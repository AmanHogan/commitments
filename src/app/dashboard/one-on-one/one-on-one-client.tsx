"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Trash2, Pencil, ChevronDown, ChevronUp, Download as ImportIcon, X } from "lucide-react";
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
import type {
  OneOnOne,
  CreateOneOnOneInput,
  BusinessCommitmentOne,
  EventCommitment,
  DevelopmentCommitmentOne,
} from "@/lib/types";
import { createOneOnOne, updateOneOnOne, deleteOneOnOne } from "./actions";
import { getBusinessCommitments } from "@/app/dashboard/business-commitments/actions";
import { getItems as getTdpItems } from "@/app/dashboard/business-commitments-two/actions";
import { getDevelopmentCommitments } from "@/app/dashboard/development-commitments-one/actions";

type ImportTarget = "businessPartnerWork" | "tdpContributions" | "trainingSkills";

interface ImportItem {
  id: string;
  label: string;
  text: string;
}

interface FormState {
  documentDate: string;
  businessPartnerWork: string;
  workloadConcerns: string;
  tdpContributions: string;
  utilizationPercentage: string;
  trainingSkills: string;
  pursuingDegrees: string;
  compliancePercentage: string;
  ehsTrainingPercentage: string;
  growthHubProgress: string;
  successPathwaysUpdated: boolean;
  contingencyTrainingPercentage: string;
  innovationEvents: string;
  accomplishments: string;
  challenges: string;
  goals: string;
  questions: string;
  receivingSupport: string;
  additionalItems: string;
  outOfOfficePlans: string;
}

/**
 * Build an empty one-on-one form state.
 * @returns A blank form.
 */
function emptyForm(): FormState {
  return {
    documentDate: "",
    businessPartnerWork: "",
    workloadConcerns: "",
    tdpContributions: "",
    utilizationPercentage: "",
    trainingSkills: "",
    pursuingDegrees: "",
    compliancePercentage: "",
    ehsTrainingPercentage: "",
    growthHubProgress: "",
    successPathwaysUpdated: false,
    contingencyTrainingPercentage: "",
    innovationEvents: "",
    accomplishments: "",
    challenges: "",
    goals: "",
    questions: "",
    receivingSupport: "",
    additionalItems: "",
    outOfOfficePlans: "",
  };
}

/**
 * Parse a percentage string to a number or null.
 * @param val The string value.
 * @returns A number or null.
 */
function parsePct(val: string): number | null {
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

/**
 * Convert form state into a server-action input payload.
 * @param form The current form state.
 * @returns The create/update input.
 */
function toInput(form: FormState): CreateOneOnOneInput {
  return {
    documentDate: form.documentDate,
    businessPartnerWork: form.businessPartnerWork || null,
    workloadConcerns: form.workloadConcerns || null,
    tdpContributions: form.tdpContributions || null,
    utilizationPercentage: parsePct(form.utilizationPercentage),
    trainingSkills: form.trainingSkills || null,
    pursuingDegrees: form.pursuingDegrees || null,
    compliancePercentage: parsePct(form.compliancePercentage),
    ehsTrainingPercentage: parsePct(form.ehsTrainingPercentage),
    growthHubProgress: form.growthHubProgress || null,
    successPathwaysUpdated: form.successPathwaysUpdated,
    contingencyTrainingPercentage: parsePct(form.contingencyTrainingPercentage),
    innovationEvents: form.innovationEvents || null,
    accomplishments: form.accomplishments || null,
    challenges: form.challenges || null,
    goals: form.goals || null,
    questions: form.questions || null,
    receivingSupport: form.receivingSupport || null,
    additionalItems: form.additionalItems || null,
    outOfOfficePlans: form.outOfOfficePlans || null,
  };
}

/**
 * Map a saved one-on-one back into form state for editing.
 * @param doc The saved one-on-one.
 * @returns Populated form state.
 */
function fromDoc(doc: OneOnOne): FormState {
  return {
    documentDate: doc.documentDate,
    businessPartnerWork: doc.businessPartnerWork ?? "",
    workloadConcerns: doc.workloadConcerns ?? "",
    tdpContributions: doc.tdpContributions ?? "",
    utilizationPercentage: doc.utilizationPercentage?.toString() ?? "",
    trainingSkills: doc.trainingSkills ?? "",
    pursuingDegrees: doc.pursuingDegrees ?? "",
    compliancePercentage: doc.compliancePercentage?.toString() ?? "",
    ehsTrainingPercentage: doc.ehsTrainingPercentage?.toString() ?? "",
    growthHubProgress: doc.growthHubProgress ?? "",
    successPathwaysUpdated: doc.successPathwaysUpdated,
    contingencyTrainingPercentage:
      doc.contingencyTrainingPercentage?.toString() ?? "",
    innovationEvents: doc.innovationEvents ?? "",
    accomplishments: doc.accomplishments ?? "",
    challenges: doc.challenges ?? "",
    goals: doc.goals ?? "",
    questions: doc.questions ?? "",
    receivingSupport: doc.receivingSupport ?? "",
    additionalItems: doc.additionalItems ?? "",
    outOfOfficePlans: doc.outOfOfficePlans ?? "",
  };
}

/**
 * Format a Business Partner Impact item for import into the 1:1 form.
 * @param c The commitment to format.
 * @returns The formatted text block.
 */
function formatBpItem(c: BusinessCommitmentOne): string {
  const lines: string[] = [`${c.workItem} (${c.status.replace("_", " ")})`];
  if (c.description) lines.push(c.description);
  if (c.impact) lines.push(`Impact: ${c.impact}`);
  if (c.started || c.dateCompleted)
    lines.push(`${c.started ?? "—"} → ${c.dateCompleted ?? "present"}`);
  return lines.join("\n") + "\n";
}

/**
 * Format a TDP event commitment for import into the 1:1 form.
 * @param e The event to format.
 * @returns The formatted text block.
 */
function formatTdpItem(e: EventCommitment): string {
  const lines: string[] = [
    `${e.eventName}${e.type ? ` (${e.type})` : ""}`,
  ];
  if (e.description) lines.push(e.description);
  if (e.started || e.finished)
    lines.push(`${e.started ?? "—"} → ${e.finished ?? "—"}`);
  if (e.subItems.length > 0)
    lines.push(
      `Sub-events: ${e.subItems.map((s) => `${s.subEventName}${s.done ? " ✓" : ""}`).join(", ")}`,
    );
  return lines.join("\n") + "\n";
}

/**
 * Format a Development Commitment for import into the 1:1 form.
 * @param d The commitment to format.
 * @returns The formatted text block.
 */
function formatDevItem(d: DevelopmentCommitmentOne): string {
  const lines: string[] = [d.itemName];
  if (d.description) lines.push(d.description);
  if (d.itemDate || d.dateCompleted)
    lines.push(`${d.itemDate ?? "—"} → ${d.dateCompleted ?? "present"}`);
  if (d.modules.length > 0)
    lines.push(
      `Modules: ${d.modules.map((m) => `${m.moduleName}${m.hours ? ` (${m.hours}h)` : ""}${m.finished ? " ✓" : ""}`).join(", ")}`,
    );
  return lines.join("\n") + "\n";
}

/**
 * Inline import picker shown below a textarea when the user clicks "Import".
 * Fetches items, lets user select any subset, then appends formatted text.
 * @param props Target field, items, and callbacks.
 * @returns The rendered import panel.
 */
function ImportPanel({
  items,
  loading,
  onInsert,
  onClose,
}: {
  items: ImportItem[];
  loading: boolean;
  onInsert: (text: string) => void;
  onClose: () => void;
}): React.JSX.Element {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  /**
   * Toggle selection of an import item.
   * @param id The item id.
   * @returns Nothing.
   */
  function toggle(id: string): void {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  /**
   * Insert all selected items as formatted text and close the panel.
   * @returns Nothing.
   */
  function handleInsert(): void {
    const text = items
      .filter((item) => selected.has(item.id))
      .map((item) => item.text)
      .join("\n");
    if (text) onInsert(text);
    onClose();
  }

  return (
    <div className="mt-1 rounded-lg border border-border bg-card p-3 flex flex-col gap-2 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Select items to import
        </p>
        <Button type="button" variant="ghost" size="icon-xs" onClick={onClose} aria-label="Close import">
          <X className="h-3 w-3" />
        </Button>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No items found.</p>
      ) : (
        <ul className="flex flex-col gap-1 max-h-48 overflow-y-auto">
          {items.map((item) => (
            <li key={item.id}>
              <label className="flex cursor-pointer items-start gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={selected.has(item.id)}
                  onChange={() => toggle(item.id)}
                />
                <span>{item.label}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
      {!loading && items.length > 0 ? (
        <div className="flex gap-2 pt-1">
          <Button
            type="button"
            size="sm"
            disabled={selected.size === 0}
            onClick={handleInsert}
          >
            Insert {selected.size > 0 ? `(${selected.size})` : ""}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Collapsible card showing a one-on-one document's fields.
 * @param props Contains the doc and edit/delete handlers.
 * @returns The rendered card.
 */
function OneOnOneCard({
  doc,
  onEdit,
  onDelete,
  isPending,
}: {
  doc: OneOnOne;
  onEdit: (doc: OneOnOne) => void;
  onDelete: (id: string) => void;
  isPending: boolean;
}): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);

  const percentageFields: { label: string; value: number | null }[] = [
    { label: "Utilization %", value: doc.utilizationPercentage },
    { label: "Compliance %", value: doc.compliancePercentage },
    { label: "EHS Training %", value: doc.ehsTrainingPercentage },
    { label: "Contingency Training %", value: doc.contingencyTrainingPercentage },
  ];

  const textFields: { label: string; value: string | null }[] = [
    { label: "Business Partner Work", value: doc.businessPartnerWork },
    { label: "Workload Concerns", value: doc.workloadConcerns },
    { label: "TDP Contributions", value: doc.tdpContributions },
    { label: "Training & Skills", value: doc.trainingSkills },
    { label: "Pursuing Degrees", value: doc.pursuingDegrees },
    { label: "Growth Hub Progress", value: doc.growthHubProgress },
    { label: "Innovation Events", value: doc.innovationEvents },
    { label: "Accomplishments", value: doc.accomplishments },
    { label: "Challenges", value: doc.challenges },
    { label: "Goals", value: doc.goals },
    { label: "Questions", value: doc.questions },
    { label: "Receiving Support", value: doc.receivingSupport },
    { label: "Additional Items", value: doc.additionalItems },
    { label: "Out-of-Office Plans", value: doc.outOfOfficePlans },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base">{doc.documentDate}</CardTitle>
            {doc.successPathwaysUpdated ? (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
                Success Pathways Updated
              </span>
            ) : null}
          </div>
          <div className="flex shrink-0 gap-1.5">
            <Button size="sm" variant="outline" disabled={isPending} onClick={() => onEdit(doc)}>
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
            <Button size="sm" variant="destructive" disabled={isPending} onClick={() => onDelete(doc.id)}>
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setExpanded((v) => !v)}
              aria-label={expanded ? "Collapse" : "Expand"}
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      {expanded ? (
        <CardContent className="flex flex-col gap-3 pt-0">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {percentageFields.map(({ label, value }) =>
              value !== null ? (
                <div key={label} className="rounded-md bg-muted px-3 py-2 text-sm">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="font-semibold">{value}%</p>
                </div>
              ) : null,
            )}
          </div>
          {textFields.map(({ label, value }) =>
            value ? (
              <div key={label}>
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
                <p className="mt-0.5 whitespace-pre-wrap text-sm">{value}</p>
              </div>
            ) : null,
          )}
        </CardContent>
      ) : null}
    </Card>
  );
}

/**
 * Interactive manager for one-on-one documents with import from BP Impact,
 * TDP Contributions, and Development Commitments.
 * @param props Contains the server-loaded `initialDocs`.
 * @returns The rendered client UI.
 */
export function OneOnOneClient({
  initialDocs,
}: {
  initialDocs: OneOnOne[];
}): React.JSX.Element {
  const [docs, setDocs] = useState<OneOnOne[]>(initialDocs);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Import state
  const [importTarget, setImportTarget] = useState<ImportTarget | null>(null);
  const [importItems, setImportItems] = useState<ImportItem[]>([]);
  const [importLoading, setImportLoading] = useState(false);

  /** @param field The form field name. @param value The new value. @returns Nothing. */
  function setField<K extends keyof FormState>(field: K, value: FormState[K]): void {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  /**
   * Open the import panel for a target field and fetch the source data.
   * @param target Which 1:1 field to import into.
   * @returns Nothing.
   */
  function openImport(target: ImportTarget): void {
    setImportTarget(target);
    setImportItems([]);
    setImportLoading(true);
    startTransition(async () => {
      try {
        if (target === "businessPartnerWork") {
          const data = await getBusinessCommitments();
          setImportItems(
            data.map((c) => ({
              id: c.id,
              label: `${c.workItem} (${c.status.replace("_", " ")})`,
              text: formatBpItem(c),
            })),
          );
        } else if (target === "tdpContributions") {
          const data = await getTdpItems();
          setImportItems(
            data.map((e) => ({
              id: e.id,
              label: `${e.eventName}${e.started ? ` — ${e.started}` : ""}`,
              text: formatTdpItem(e),
            })),
          );
        } else {
          const data = await getDevelopmentCommitments();
          setImportItems(
            data.map((d) => ({
              id: d.id,
              label: `${d.itemName}${d.itemDate ? ` (${d.itemDate})` : ""}`,
              text: formatDevItem(d),
            })),
          );
        }
      } catch {
        setImportItems([]);
      } finally {
        setImportLoading(false);
      }
    });
  }

  /**
   * Append imported text to a form field.
   * @param field The target form field.
   * @param text The text to append.
   * @returns Nothing.
   */
  function appendImport(field: ImportTarget, text: string): void {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field] ? `${prev[field]}\n\n${text}` : text,
    }));
  }

  /**
   * Create or update a one-on-one from the form.
   * @param event The form submit event.
   * @returns Nothing.
   */
  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setError(null);
    if (!form.documentDate) {
      setError("Document date is required.");
      return;
    }
    const payload = toInput(form);
    startTransition(async () => {
      try {
        if (editingId) {
          const updated = await updateOneOnOne(editingId, payload);
          if (updated) {
            setDocs((prev) => prev.map((d) => (d.id === editingId ? updated : d)));
          }
          setEditingId(null);
        } else {
          const created = await createOneOnOne(payload);
          setDocs((prev) =>
            [created, ...prev].sort((a, b) => b.documentDate.localeCompare(a.documentDate)),
          );
        }
        setForm(emptyForm());
      } catch {
        setError("Could not save one-on-one.");
      }
    });
  }

  /**
   * Load a one-on-one into the form for editing.
   * @param doc The document to edit.
   * @returns Nothing.
   */
  function startEdit(doc: OneOnOne): void {
    setEditingId(doc.id);
    setForm(fromDoc(doc));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /**
   * Delete a one-on-one document.
   * @param id The document id.
   * @returns Nothing.
   */
  function handleDelete(id: string): void {
    startTransition(async () => {
      try {
        await deleteOneOnOne(id);
        setDocs((prev) => prev.filter((d) => d.id !== id));
      } catch {
        setError("Could not delete one-on-one.");
      }
    });
  }

  /**
   * Render a textarea with an optional Import button and the import panel below.
   * @param field The form field key.
   * @param label The visible label.
   * @param target The import target (or undefined if no import for this field).
   * @param importLabel The label on the import button.
   * @returns The rendered field with optional import panel.
   */
  function ImportableField({
    field,
    label,
    target,
    importLabel,
    rows = 3,
  }: {
    field: keyof FormState;
    label: string;
    target?: ImportTarget;
    importLabel?: string;
    rows?: number;
  }): React.JSX.Element {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={String(field)}>{label}</Label>
          {target ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() =>
                importTarget === target ? setImportTarget(null) : openImport(target)
              }
            >
              <ImportIcon className="h-3 w-3" />
              {importLabel ?? "Import"}
            </Button>
          ) : null}
        </div>
        <Textarea
          id={String(field)}
          rows={rows}
          value={form[field] as string}
          onChange={(e) => setField(field, e.target.value)}
        />
        {target && importTarget === target ? (
          <ImportPanel
            items={importItems}
            loading={importLoading}
            onInsert={(text) => appendImport(target, text)}
            onClose={() => setImportTarget(null)}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Edit one-on-one" : "New one-on-one"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* ── Core ── */}
            <div className="flex flex-col gap-1">
              <Label htmlFor="documentDate">Document date *</Label>
              <Input
                id="documentDate"
                type="date"
                value={form.documentDate}
                onChange={(e) => setField("documentDate", e.target.value)}
                required
              />
            </div>

            {/* ── Work ── */}
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Work
            </p>
            <ImportableField
              field="businessPartnerWork"
              label="Business Partner Work"
              target="businessPartnerWork"
              importLabel="Import from BP Impact"
            />
            <ImportableField
              field="workloadConcerns"
              label="Workload Concerns"
            />
            <ImportableField
              field="tdpContributions"
              label="TDP Contributions"
              target="tdpContributions"
              importLabel="Import from TDP Impact"
            />

            {/* ── Percentages ── */}
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Metrics
            </p>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  ["utilizationPercentage", "Utilization %"],
                  ["compliancePercentage", "Compliance %"],
                  ["ehsTrainingPercentage", "EHS Training %"],
                  ["contingencyTrainingPercentage", "Contingency Training %"],
                ] as [keyof FormState, string][]
              ).map(([field, label]) => (
                <div key={String(field)} className="flex flex-col gap-1">
                  <Label htmlFor={String(field)}>{label}</Label>
                  <Input
                    id={String(field)}
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={form[field] as string}
                    onChange={(e) => setField(field, e.target.value)}
                  />
                </div>
              ))}
            </div>

            {/* ── Training & Growth ── */}
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Training &amp; Growth
            </p>
            <ImportableField
              field="trainingSkills"
              label="Training Skills"
              target="trainingSkills"
              importLabel="Import from Dev Commitments"
            />
            <ImportableField field="pursuingDegrees" label="Pursuing Degrees" rows={2} />
            <ImportableField field="growthHubProgress" label="Growth Hub Progress" rows={2} />
            <ImportableField field="innovationEvents" label="Innovation Events" rows={2} />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.successPathwaysUpdated}
                onChange={(e) => setField("successPathwaysUpdated", e.target.checked)}
              />
              Success Pathways Updated
            </label>

            {/* ── Notes ── */}
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Notes
            </p>
            {(
              [
                ["accomplishments", "Accomplishments"],
                ["challenges", "Challenges"],
                ["goals", "Goals"],
                ["questions", "Questions"],
                ["receivingSupport", "Receiving Support"],
                ["additionalItems", "Additional Items"],
                ["outOfOfficePlans", "Out-of-Office Plans"],
              ] as [keyof FormState, string][]
            ).map(([field, label]) => (
              <div key={String(field)} className="flex flex-col gap-1">
                <Label htmlFor={String(field)}>{label}</Label>
                <Textarea
                  id={String(field)}
                  rows={2}
                  value={form[field] as string}
                  onChange={(e) => setField(field, e.target.value)}
                />
              </div>
            ))}

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex gap-2">
              <Button type="submit" disabled={isPending}>
                {editingId ? "Save changes" : "Create"}
              </Button>
              {editingId ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setEditingId(null); setForm(emptyForm()); }}
                >
                  Cancel
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        {docs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No one-on-one documents yet.</p>
        ) : (
          docs.map((doc) => (
            <OneOnOneCard
              key={doc.id}
              doc={doc}
              onEdit={startEdit}
              onDelete={handleDelete}
              isPending={isPending}
            />
          ))
        )}
      </div>
    </div>
  );
}
