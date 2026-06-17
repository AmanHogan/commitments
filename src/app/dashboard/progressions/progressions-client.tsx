"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Trash2, ArrowRight, Check, FileText, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StarEntryEditor } from "@/components/star-entry-editor";
import type {
  Progression,
  StarEntry,
  DevelopmentEntry,
  BusinessCommitmentOne,
  EventCommitment,
  DevelopmentCommitmentOne,
  SaveProgressionInput,
} from "@/lib/types";
import { businessToStar, eventToStar, newStarId } from "@/lib/star";
import {
  createProgression,
  updateProgression,
  deleteProgression,
} from "./actions";

type SectionKey = "business" | "program" | "development";

const SECTIONS: { key: SectionKey; label: string; hint: string }[] = [
  { key: "business", label: "Business Impact", hint: "Section 1 · STAR · 3-5 items" },
  { key: "program", label: "Program Impact", hint: "Section 2 · STAR · 3-5 items · TDP + Innovation" },
  { key: "development", label: "Development", hint: "Section 3 · paragraph · 2-4 items" },
];

interface DraftState {
  title: string;
  businessEntries: StarEntry[];
  programEntries: StarEntry[];
  developmentEntries: DevelopmentEntry[];
}

/** A unified pool item shown in the left column. */
interface PoolItem {
  id: string;
  title: string;
  subtitle: string;
}

/**
 * Build an empty draft for a brand-new progression.
 * @returns A blank draft state.
 */
function emptyDraft(): DraftState {
  return {
    title: "",
    businessEntries: [],
    programEntries: [],
    developmentEntries: [],
  };
}

/**
 * Convert a progression DTO into the local editable draft.
 * @param p The progression to load.
 * @returns The draft state.
 */
function toDraft(p: Progression): DraftState {
  return {
    title: p.title,
    businessEntries: p.businessEntries,
    programEntries: p.programEntries,
    developmentEntries: p.developmentEntries,
  };
}

/**
 * Convert a development commitment into a non-STAR development entry draft.
 * @param d The development commitment to convert.
 * @returns A development entry linked to the source commitment.
 */
function developmentToEntry(d: DevelopmentCommitmentOne): DevelopmentEntry {
  const hours = d.modules.reduce((sum, m) => sum + (m.hours ?? 0), 0);
  const moduleLine =
    d.modules.length > 0
      ? `Modules: ${d.modules.map((m) => m.moduleName).join(", ")}`
      : "";
  const body = [d.description ?? "", moduleLine]
    .filter((s) => s.trim().length > 0)
    .join("\n\n");
  return {
    id: d.id,
    sourceId: d.id,
    title: d.itemName,
    body,
    hours: hours > 0 ? hours : null,
  };
}

/**
 * Strip the local id from a STAR entry for the save payload.
 * @param e The STAR entry.
 * @returns The entry without its id.
 */
function stripStar(e: StarEntry): Omit<StarEntry, "id"> {
  return {
    sourceType: e.sourceType,
    sourceId: e.sourceId,
    title: e.title,
    situation: e.situation,
    task: e.task,
    action: e.action,
    result: e.result,
  };
}

/**
 * Strip the local id from a development entry for the save payload.
 * @param e The development entry.
 * @returns The entry without its id.
 */
function stripDev(e: DevelopmentEntry): Omit<DevelopmentEntry, "id"> {
  return {
    sourceId: e.sourceId,
    title: e.title,
    body: e.body,
    hours: e.hours,
  };
}

/**
 * Editor card for a single non-STAR development accomplishment.
 * @param props The entry plus change/remove handlers.
 * @returns The rendered development entry card.
 */
function DevelopmentEntryEditor({
  entry,
  onChange,
  onRemove,
  index,
}: {
  entry: DevelopmentEntry;
  onChange: (entry: DevelopmentEntry) => void;
  onRemove: () => void;
  index: number;
}): React.JSX.Element {
  return (
    <Card className="border-l-4 border-l-primary/60">
      <CardContent className="flex flex-col gap-3 pt-4">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Label htmlFor={`dev-title-${entry.id}`}>{index}. Title</Label>
            <Input
              id={`dev-title-${entry.id}`}
              className="mt-1"
              value={entry.title}
              onChange={(e) => onChange({ ...entry, title: e.target.value })}
            />
          </div>
          <div className="w-24">
            <Label htmlFor={`dev-hours-${entry.id}`}>Hours</Label>
            <Input
              id={`dev-hours-${entry.id}`}
              className="mt-1"
              type="number"
              min={0}
              value={entry.hours ?? ""}
              onChange={(e) =>
                onChange({
                  ...entry,
                  hours: e.target.value === "" ? null : Number(e.target.value),
                })
              }
            />
          </div>
          <Button type="button" variant="ghost" size="icon-xs" onClick={onRemove} aria-label="Remove">
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
        <div>
          <Label htmlFor={`dev-body-${entry.id}`}>Accomplishment (paragraph form)</Label>
          <Textarea
            id={`dev-body-${entry.id}`}
            className="mt-1"
            rows={4}
            value={entry.body}
            onChange={(e) => onChange({ ...entry, body: e.target.value })}
          />
          <p className="mt-1 text-[0.7rem] text-muted-foreground">
            Show the arc: what you learned, what you built, how you applied it. Include hours.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * The left-hand importable pool list for a section.
 * @param props The pool items, an "is already added" predicate, and add handler.
 * @returns The rendered pool column.
 */
function PoolColumn({
  items,
  isAdded,
  onAdd,
  emptyLabel,
}: {
  items: PoolItem[];
  isAdded: (id: string) => boolean;
  onAdd: (id: string) => void;
  emptyLabel: string;
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Available to import ({items.length})
      </p>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {items.map((item) => {
            const added = isAdded(item.id);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  disabled={added}
                  onClick={() => onAdd(item.id)}
                  className="group flex w-full items-start gap-2 rounded-lg border border-border bg-card px-3 py-2 text-left text-sm transition hover:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {added ? (
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                  ) : (
                    <Plus className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
                  )}
                  <span className="flex-1">
                    <span className="block font-medium">{item.title}</span>
                    {item.subtitle ? (
                      <span className="block text-xs text-muted-foreground">{item.subtitle}</span>
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/**
 * Progressions manager: pick or create a progression, then curate each section
 * by importing from your commitment pools (left) and refining the selected 3-5
 * STAR entries (right). Business and Program use STAR; Development is paragraph.
 * @param props The initial progressions and all four source pools.
 * @returns The rendered client UI.
 */
export function ProgressionsClient({
  initialProgressions,
  businessPool,
  tdpPool,
  innovationPool,
  developmentPool,
}: {
  initialProgressions: Progression[];
  businessPool: BusinessCommitmentOne[];
  tdpPool: EventCommitment[];
  innovationPool: EventCommitment[];
  developmentPool: DevelopmentCommitmentOne[];
}): React.JSX.Element {
  const [progressions, setProgressions] = useState<Progression[]>(initialProgressions);
  const [activeId, setActiveId] = useState<string | "__new__" | null>(null);
  const [draft, setDraft] = useState<DraftState>(emptyDraft());
  const [section, setSection] = useState<SectionKey>("business");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  /**
   * Open a progression (or a new blank one) into the editor.
   * @param p The progression to edit, or null for a new one.
   * @returns Nothing.
   */
  function openEditor(p: Progression | null): void {
    setError(null);
    setSection("business");
    if (p) {
      setActiveId(p.id);
      setDraft(toDraft(p));
    } else {
      setActiveId("__new__");
      setDraft(emptyDraft());
    }
  }

  /** Close the editor and return to the progression list. */
  function closeEditor(): void {
    setActiveId(null);
    setDraft(emptyDraft());
    setError(null);
  }

  // ── Pools mapped to the unified PoolItem shape ──
  const businessItems = useMemo<PoolItem[]>(
    () =>
      businessPool.map((c) => ({
        id: c.id,
        title: c.workItem,
        subtitle: c.status.replace("_", " "),
      })),
    [businessPool],
  );

  const programItems = useMemo<PoolItem[]>(
    () => [
      ...tdpPool.map((e) => ({
        id: e.id,
        title: e.eventName,
        subtitle: `TDP${e.type ? ` · ${e.type}` : ""}`,
      })),
      ...innovationPool.map((e) => ({
        id: e.id,
        title: e.eventName,
        subtitle: `Innovation${e.type ? ` · ${e.type}` : ""}`,
      })),
    ],
    [tdpPool, innovationPool],
  );

  const developmentItems = useMemo<PoolItem[]>(
    () =>
      developmentPool.map((d) => ({
        id: d.id,
        title: d.itemName,
        subtitle: d.itemDate ?? "",
      })),
    [developmentPool],
  );

  /**
   * Add a business commitment to the Business section as a STAR draft.
   * @param id The source commitment id.
   * @returns Nothing.
   */
  function addBusiness(id: string): void {
    const c = businessPool.find((x) => x.id === id);
    if (!c) return;
    setDraft((d) => ({ ...d, businessEntries: [...d.businessEntries, businessToStar(c)] }));
  }

  /**
   * Add a TDP or Innovation event to the Program section as a STAR draft.
   * @param id The source event id.
   * @returns Nothing.
   */
  function addProgram(id: string): void {
    const tdp = tdpPool.find((x) => x.id === id);
    const inno = innovationPool.find((x) => x.id === id);
    const entry = tdp
      ? eventToStar(tdp, "bcomm2")
      : inno
        ? eventToStar(inno, "dcomm2")
        : null;
    if (!entry) return;
    setDraft((d) => ({ ...d, programEntries: [...d.programEntries, entry] }));
  }

  /**
   * Add a development commitment to the Development section.
   * @param id The source commitment id.
   * @returns Nothing.
   */
  function addDevelopment(id: string): void {
    const dc = developmentPool.find((x) => x.id === id);
    if (!dc) return;
    setDraft((d) => ({
      ...d,
      developmentEntries: [...d.developmentEntries, developmentToEntry(dc)],
    }));
  }

  /** Add a blank STAR entry to the active STAR section. */
  function addBlankStar(): void {
    const blank: StarEntry = {
      id: newStarId(),
      sourceType: null,
      sourceId: null,
      title: "",
      situation: "",
      task: "",
      action: "",
      result: "",
    };
    setDraft((d) =>
      section === "business"
        ? { ...d, businessEntries: [...d.businessEntries, blank] }
        : { ...d, programEntries: [...d.programEntries, blank] },
    );
  }

  /** Add a blank development entry. */
  function addBlankDevelopment(): void {
    const blank: DevelopmentEntry = {
      id: newStarId(),
      sourceId: null,
      title: "",
      body: "",
      hours: null,
    };
    setDraft((d) => ({ ...d, developmentEntries: [...d.developmentEntries, blank] }));
  }

  /**
   * Persist the current draft (create or update).
   * @returns Nothing.
   */
  function handleSave(): void {
    setError(null);
    if (!draft.title.trim()) {
      setError("Give your progression a title first.");
      return;
    }
    const payload: SaveProgressionInput = {
      title: draft.title.trim(),
      businessEntries: draft.businessEntries.map(stripStar),
      programEntries: draft.programEntries.map(stripStar),
      developmentEntries: draft.developmentEntries.map(stripDev),
    };
    startTransition(async () => {
      try {
        if (activeId && activeId !== "__new__") {
          const updated = await updateProgression(activeId, payload);
          if (updated) {
            setProgressions((prev) => prev.map((p) => (p.id === activeId ? updated : p)));
          }
        } else {
          const created = await createProgression(payload);
          setProgressions((prev) => [created, ...prev]);
          setActiveId(created.id);
        }
      } catch {
        setError("Could not save progression.");
      }
    });
  }

  /**
   * Delete the active progression.
   * @returns Nothing.
   */
  function handleDelete(): void {
    if (!activeId || activeId === "__new__") {
      closeEditor();
      return;
    }
    startTransition(async () => {
      try {
        await deleteProgression(activeId);
        setProgressions((prev) => prev.filter((p) => p.id !== activeId));
        closeEditor();
      } catch {
        setError("Could not delete progression.");
      }
    });
  }

  // ── Progression list view ──
  if (activeId === null) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <Button onClick={() => openEditor(null)}>
            <Plus className="h-4 w-4" />
            New progression
          </Button>
        </div>
        {progressions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No progressions yet. Create one to start curating your best work.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {progressions.map((p) => (
              <Card key={p.id} className="cursor-pointer transition hover:border-primary" onClick={() => openEditor(p)}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-base">
                    {p.title}
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex gap-4 pt-0 text-xs text-muted-foreground">
                  <span>{p.businessEntries.length} business</span>
                  <span>{p.programEntries.length} program</span>
                  <span>{p.developmentEntries.length} development</span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Editor view ──
  const starEntries =
    section === "business" ? draft.businessEntries : draft.programEntries;

  /**
   * Update a STAR entry in the active section by index.
   * @param idx The entry index.
   * @param updated The updated entry.
   * @returns Nothing.
   */
  function updateStar(idx: number, updated: StarEntry): void {
    setDraft((d) => {
      const key = section === "business" ? "businessEntries" : "programEntries";
      const list = [...d[key]];
      list[idx] = updated;
      return { ...d, [key]: list };
    });
  }

  /**
   * Remove a STAR entry from the active section by index.
   * @param idx The entry index.
   * @returns Nothing.
   */
  function removeStar(idx: number): void {
    setDraft((d) => {
      const key = section === "business" ? "businessEntries" : "programEntries";
      return { ...d, [key]: d[key].filter((_, i) => i !== idx) };
    });
  }

  const activePool =
    section === "business"
      ? businessItems
      : section === "program"
        ? programItems
        : developmentItems;
  const onAddFromPool =
    section === "business"
      ? addBusiness
      : section === "program"
        ? addProgram
        : addDevelopment;
  const selectedSourceIds = new Set(
    (section === "development" ? draft.developmentEntries : starEntries)
      .map((e) => e.sourceId)
      .filter((x): x is string => x !== null),
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Top bar: title + actions */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-60">
          <Label htmlFor="prog-title">Progression title</Label>
          <Input
            id="prog-title"
            className="mt-1"
            value={draft.title}
            placeholder="e.g. 2026 Progression — Software Engineer → Senior"
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={closeEditor} disabled={isPending}>
            Back
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {/* Section nav */}
      <div className="flex flex-wrap gap-2 border-b border-border">
        {SECTIONS.map((s) => {
          const count =
            s.key === "business"
              ? draft.businessEntries.length
              : s.key === "program"
                ? draft.programEntries.length
                : draft.developmentEntries.length;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setSection(s.key)}
              className={`-mb-px flex flex-col items-start border-b-2 px-3 py-2 text-sm transition ${
                section === s.key
                  ? "border-primary font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>
                {s.label} <span className="text-xs text-muted-foreground">({count})</span>
              </span>
              <span className="text-[0.7rem] text-muted-foreground">{s.hint}</span>
            </button>
          );
        })}
      </div>

      {/* Two-column: pool (left) / selected (right) */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        {/* Left pool */}
        <div className="rounded-xl border border-border bg-muted/20 p-4">
          <PoolColumn
            items={activePool}
            isAdded={(id) => selectedSourceIds.has(id)}
            onAdd={onAddFromPool}
            emptyLabel="Nothing here yet — add items on its source page first."
          />
        </div>

        {/* Right selected */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <ArrowRight className="mr-1 inline h-3 w-3" />
              On your progression
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={section === "development" ? addBlankDevelopment : addBlankStar}
            >
              <Plus className="h-4 w-4" />
              Add blank
            </Button>
          </div>

          {section === "development" ? (
            draft.developmentEntries.length === 0 ? (
              <EmptySelected />
            ) : (
              draft.developmentEntries.map((entry, idx) => (
                <DevelopmentEntryEditor
                  key={entry.id}
                  entry={entry}
                  index={idx + 1}
                  onChange={(updated) =>
                    setDraft((d) => {
                      const list = [...d.developmentEntries];
                      list[idx] = updated;
                      return { ...d, developmentEntries: list };
                    })
                  }
                  onRemove={() =>
                    setDraft((d) => ({
                      ...d,
                      developmentEntries: d.developmentEntries.filter((_, i) => i !== idx),
                    }))
                  }
                />
              ))
            )
          ) : starEntries.length === 0 ? (
            <EmptySelected />
          ) : (
            starEntries.map((entry, idx) => (
              <StarEntryEditor
                key={entry.id}
                entry={entry}
                index={idx + 1}
                onChange={(updated) => updateStar(idx, updated)}
                onRemove={() => removeStar(idx)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Placeholder shown in the selected column when a section is empty.
 * @returns The rendered empty state.
 */
function EmptySelected(): React.JSX.Element {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
      <FileText className="h-6 w-6" />
      <p>Import items from the left, or add a blank entry to start writing.</p>
    </div>
  );
}
