"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { Trash2, Pencil, Download, X } from "lucide-react";
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
import type { Skill, CreateSkillInput } from "@/lib/types";
import { createSkill, updateSkill, deleteSkill } from "./actions";

type SortField = "name" | "proficiency" | "date" | "createdAt";
type SortDir = "asc" | "desc";

const PROFICIENCY_LABELS: Record<number, string> = {
  1: "Beginner",
  2: "Basic",
  3: "Intermediate",
  4: "Advanced",
  5: "Expert",
};

const PROFICIENCY_RING_COLORS: Record<number, string> = {
  1: "#ef4444",
  2: "#f97316",
  3: "#eab308",
  4: "#3b82f6",
  5: "#22c55e",
};

const PROFICIENCY_BADGE_COLORS: Record<number, string> = {
  1: "bg-red-100 text-red-800",
  2: "bg-orange-100 text-orange-800",
  3: "bg-yellow-100 text-yellow-800",
  4: "bg-blue-100 text-blue-800",
  5: "bg-green-100 text-green-800",
};

interface FormState {
  name: string;
  proficiency: string;
  date: string;
  tagsRaw: string;
}

/**
 * Build an empty skill form state.
 * @returns A blank form.
 */
function emptyForm(): FormState {
  return { name: "", proficiency: "3", date: "", tagsRaw: "" };
}

/**
 * Convert form state into a create/update input payload.
 * @param form The form state.
 * @returns The skill input.
 */
function toInput(form: FormState): CreateSkillInput {
  return {
    name: form.name.trim(),
    proficiency: parseInt(form.proficiency, 10),
    date: form.date || null,
    tags: form.tagsRaw
      ? form.tagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
      : [],
  };
}

/**
 * Trigger a browser download of a markdown string.
 * @param content The markdown text.
 * @param filename The base filename (without extension).
 * @returns Nothing.
 */
function downloadMarkdown(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/markdown; charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generate and download a markdown export of all skills.
 * @param skills The skills to export.
 * @returns Nothing.
 */
function exportMarkdown(skills: Skill[]): void {
  let md = "# Skills\n\n";
  md += `| Skill | Level | Proficiency | Tags | Date Added |\n`;
  md += `|-------|-------|-------------|------|------------|\n`;
  for (const s of skills) {
    const tags = s.tags.length ? s.tags.join(", ") : "—";
    md += `| ${s.name} | ${s.proficiency}/5 | ${PROFICIENCY_LABELS[s.proficiency] ?? ""} | ${tags} | ${s.date ?? "—"} |\n`;
  }
  downloadMarkdown(md, "skills");
}

/**
 * SVG proficiency ring showing level as a filled arc.
 * @param props The proficiency value (1-5) and optional size.
 * @returns The rendered SVG ring.
 */
function ProficiencyRing({
  value,
  size = 56,
}: {
  value: number;
  size?: number;
}): React.JSX.Element {
  const r = size * 0.36;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const fill = (Math.min(Math.max(value, 0), 5) / 5) * circ;
  const color = PROFICIENCY_RING_COLORS[value] ?? "#6b7280";
  const fontSize = size * 0.22;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-label={`Proficiency ${value} of 5`}
      className="shrink-0"
    >
      {/* Track */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={size * 0.1}
        className="text-muted"
        opacity={0.3}
      />
      {/* Fill arc */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={size * 0.1}
        strokeDasharray={`${fill} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      {/* Label */}
      <text
        x={cx}
        y={cy + fontSize * 0.35}
        textAnchor="middle"
        fontSize={fontSize}
        fontWeight="700"
        fill="currentColor"
      >
        {value}/5
      </text>
    </svg>
  );
}

interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

/**
 * Calculate the SVG arc path for a donut ring segment.
 * @param cx Center x.
 * @param cy Center y.
 * @param r Radius.
 * @param angleDeg Angle in degrees (0 = top, clockwise).
 * @returns The x/y cartesian coordinates.
 */
function polarToXY(
  cx: number,
  cy: number,
  r: number,
  angleDeg: number,
): { x: number; y: number } {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/**
 * Build an SVG path string for a donut ring segment (annular sector).
 * @param cx Center x.
 * @param cy Center y.
 * @param outerR Outer radius.
 * @param innerR Inner radius.
 * @param startDeg Start angle in degrees.
 * @param endDeg End angle in degrees.
 * @returns SVG path d attribute.
 */
function donutSegmentPath(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startDeg: number,
  endDeg: number,
): string {
  // Clamp to avoid degenerate arcs at 360°
  const clampedEnd = Math.min(endDeg, startDeg + 359.99);
  const os = polarToXY(cx, cy, outerR, startDeg);
  const oe = polarToXY(cx, cy, outerR, clampedEnd);
  const ie = polarToXY(cx, cy, innerR, clampedEnd);
  const is = polarToXY(cx, cy, innerR, startDeg);
  const large = clampedEnd - startDeg > 180 ? 1 : 0;
  return [
    `M ${os.x} ${os.y}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${oe.x} ${oe.y}`,
    `L ${ie.x} ${ie.y}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${is.x} ${is.y}`,
    "Z",
  ].join(" ");
}

/**
 * SVG donut chart showing a set of labeled segments with a legend.
 * @param props Segments, center label, and optional size.
 * @returns The rendered donut chart with legend.
 */
function DonutChart({
  segments,
  centerLine1,
  centerLine2,
  size = 160,
}: {
  segments: DonutSegment[];
  centerLine1: string;
  centerLine2: string;
  size?: number;
}): React.JSX.Element {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.42;
  const innerR = size * 0.26;

  let cumDeg = 0;

  return (
    <div className="flex items-center gap-5">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-label="Donut chart"
        className="shrink-0"
      >
        {total === 0 ? (
          <circle
            cx={cx}
            cy={cy}
            r={(outerR + innerR) / 2}
            fill="none"
            stroke="currentColor"
            strokeWidth={outerR - innerR}
            className="text-muted opacity-20"
          />
        ) : (
          segments.map((seg, i) => {
            if (seg.value === 0) return null;
            const sweep = (seg.value / total) * 360;
            const path = donutSegmentPath(
              cx, cy, outerR, innerR, cumDeg, cumDeg + sweep,
            );
            cumDeg += sweep;
            return <path key={i} d={path} fill={seg.color} />;
          })
        )}
        {/* Gap ring */}
        <circle cx={cx} cy={cy} r={innerR} fill="var(--card, white)" />
        {/* Center labels */}
        <text
          x={cx}
          y={cy - size * 0.04}
          textAnchor="middle"
          fontSize={size * 0.18}
          fontWeight="700"
          fill="currentColor"
        >
          {centerLine1}
        </text>
        <text
          x={cx}
          y={cy + size * 0.14}
          textAnchor="middle"
          fontSize={size * 0.1}
          fill="currentColor"
          opacity={0.55}
        >
          {centerLine2}
        </text>
      </svg>
      {/* Legend */}
      <div className="flex flex-col gap-1.5 min-w-0">
        {segments
          .filter((s) => s.value > 0)
          .map((seg, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <div
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: seg.color }}
              />
              <span className="truncate text-muted-foreground">{seg.label}</span>
              <span className="ml-auto font-semibold">{seg.value}</span>
              <span className="text-muted-foreground">
                {Math.round((seg.value / total) * 100)}%
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}

const TAG_PALETTE = [
  "#6366f1", "#ec4899", "#14b8a6", "#f59e0b",
  "#8b5cf6", "#10b981", "#f97316", "#3b82f6",
  "#ef4444", "#84cc16",
];

/**
 * Summary panel with proficiency bars + two donut charts (proficiency + tags).
 * @param props The full skill list.
 * @returns The rendered summary.
 */
function ProficiencySummary({
  skills,
}: {
  skills: Skill[];
}): React.JSX.Element {
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const s of skills) {
    const lvl = Math.min(Math.max(s.proficiency, 1), 5);
    counts[lvl] = (counts[lvl] ?? 0) + 1;
  }
  const total = skills.length;
  const avgRaw = total
    ? skills.reduce((sum, s) => sum + s.proficiency, 0) / total
    : 0;
  const avg = Math.round(avgRaw * 10) / 10;

  // Proficiency donut segments
  const proficiencySegments: DonutSegment[] = [5, 4, 3, 2, 1].map((lvl) => ({
    label: PROFICIENCY_LABELS[lvl] ?? "",
    value: counts[lvl] ?? 0,
    color: PROFICIENCY_RING_COLORS[lvl] ?? "#6b7280",
  }));

  // Tags donut — top 7 by count, rest grouped as "Other"
  const tagCounts = new Map<string, number>();
  for (const s of skills) {
    for (const t of s.tags) {
      tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
    }
  }
  const sortedTags = Array.from(tagCounts.entries()).sort((a, b) => b[1] - a[1]);
  const topTags = sortedTags.slice(0, 7);
  const otherCount = sortedTags.slice(7).reduce((s, [, c]) => s + c, 0);
  const tagSegments: DonutSegment[] = [
    ...topTags.map(([tag, count], i) => ({
      label: tag,
      value: count,
      color: TAG_PALETTE[i % TAG_PALETTE.length] ?? "#6b7280",
    })),
    ...(otherCount > 0
      ? [{ label: "Other", value: otherCount, color: "#9ca3af" }]
      : []),
  ];
  const totalTagged = skills.filter((s) => s.tags.length > 0).length;

  return (
    <Card className="bg-muted/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">
          Skill Summary — {total} skill{total !== 1 ? "s" : ""} · Avg {total ? avg : "—"}/5
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {/* Distribution bars */}
        <div className="flex flex-col gap-1.5">
          {[5, 4, 3, 2, 1].map((lvl) => {
            const count = counts[lvl] ?? 0;
            const pct = total ? Math.round((count / total) * 100) : 0;
            return (
              <div key={lvl} className="flex items-center gap-2 text-xs">
                <span className="w-24 shrink-0 text-muted-foreground">
                  {PROFICIENCY_LABELS[lvl]}
                </span>
                <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: PROFICIENCY_RING_COLORS[lvl],
                    }}
                  />
                </div>
                <span className="w-6 shrink-0 text-right text-muted-foreground">
                  {count}
                </span>
              </div>
            );
          })}
        </div>

        {/* Donut charts side by side */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              By Proficiency
            </p>
            <DonutChart
              segments={proficiencySegments}
              centerLine1={String(total)}
              centerLine2="skills"
              size={140}
            />
          </div>
          {tagSegments.length > 0 ? (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                By Tag
              </p>
              <DonutChart
                segments={tagSegments}
                centerLine1={String(totalTagged)}
                centerLine2="tagged"
                size={140}
              />
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Complete skills manager: add/edit/delete skills, proficiency rings,
 * tags, date tracking, sort controls, and markdown export.
 * @param props Contains the server-loaded `initialSkills`.
 * @returns The rendered skills client UI.
 */
export function SkillsClient({
  initialSkills,
}: {
  initialSkills: Skill[];
}): React.JSX.Element {
  const [skills, setSkills] = useState<Skill[]>(initialSkills);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("proficiency");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [filterTag, setFilterTag] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const allTags = useMemo<string[]>(() => {
    const set = new Set<string>();
    for (const s of skills) {
      for (const t of s.tags) set.add(t);
    }
    return Array.from(set).sort();
  }, [skills]);

  const displaySkills = useMemo<Skill[]>(() => {
    let list = filterTag ? skills.filter((s) => s.tags.includes(filterTag)) : skills;
    list = [...list].sort((a, b) => {
      let result = 0;
      if (sortField === "name") {
        result = a.name.localeCompare(b.name);
      } else if (sortField === "proficiency") {
        result = a.proficiency - b.proficiency;
      } else if (sortField === "date") {
        result = (a.date ?? "").localeCompare(b.date ?? "");
      } else {
        result = a.createdAt.localeCompare(b.createdAt);
      }
      return sortDir === "asc" ? result : -result;
    });
    return list;
  }, [skills, sortField, sortDir, filterTag]);

  /**
   * Submit the form to create or update a skill.
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
          const updated = await updateSkill(editingId, payload);
          if (updated) {
            setSkills((prev) => prev.map((s) => (s.id === editingId ? updated : s)));
          }
          setEditingId(null);
        } else {
          const created = await createSkill(payload);
          setSkills((prev) => [created, ...prev]);
        }
        setForm(emptyForm());
      } catch {
        setError("Could not save skill.");
      }
    });
  }

  /**
   * Load a skill into the form for editing.
   * @param skill The skill to edit.
   * @returns Nothing.
   */
  function startEdit(skill: Skill): void {
    setEditingId(skill.id);
    setForm({
      name: skill.name,
      proficiency: skill.proficiency.toString(),
      date: skill.date ?? "",
      tagsRaw: skill.tags.join(", "),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /**
   * Delete a skill.
   * @param id The skill id.
   * @returns Nothing.
   */
  function handleDelete(id: string): void {
    startTransition(async () => {
      try {
        await deleteSkill(id);
        setSkills((prev) => prev.filter((s) => s.id !== id));
      } catch {
        setError("Could not delete skill.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Summary */}
      {skills.length > 0 ? <ProficiencySummary skills={skills} /> : null}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium">Sort by</span>
        <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="proficiency">Proficiency</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="date">Date added</SelectItem>
            <SelectItem value="createdAt">Created</SelectItem>
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
        {allTags.length > 0 ? (
          <Select
            value={filterTag}
            onValueChange={(v) => setFilterTag(v === "__all__" ? "" : v)}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Filter by tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All tags</SelectItem>
              {allTags.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          onClick={() => exportMarkdown(displaySkills)}
        >
          <Download className="h-4 w-4" />
          Export MD
        </Button>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Edit skill" : "Add skill"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="name">Skill name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Kubernetes"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <Label>Proficiency (1–5)</Label>
                <Select
                  value={form.proficiency}
                  onValueChange={(v) => setForm((p) => ({ ...p, proficiency: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <SelectItem key={n} value={n.toString()}>
                        {n} — {PROFICIENCY_LABELS[n]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="date">Date learned</Label>
                <Input
                  id="date"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={form.tagsRaw}
                onChange={(e) => setForm((p) => ({ ...p, tagsRaw: e.target.value }))}
                placeholder="e.g. devops, cloud, networking"
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex gap-2">
              <Button type="submit" disabled={isPending}>
                {editingId ? "Save changes" : "Add skill"}
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

      {/* Active tag filter chip */}
      {filterTag ? (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Filtering by tag:</span>
          <span className="flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
            {filterTag}
            <button
              type="button"
              onClick={() => setFilterTag("")}
              aria-label="Clear tag filter"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        </div>
      ) : null}

      {/* Skill cards */}
      <div className="flex flex-col gap-2">
        {displaySkills.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {filterTag ? `No skills tagged "${filterTag}".` : "No skills yet."}
          </p>
        ) : (
          displaySkills.map((skill) => (
            <Card key={skill.id}>
              <CardContent className="flex items-center gap-4 pt-4">
                {/* Proficiency ring */}
                <ProficiencyRing value={skill.proficiency} />

                {/* Info */}
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="font-semibold">{skill.name}</p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        PROFICIENCY_BADGE_COLORS[skill.proficiency],
                      )}
                    >
                      {PROFICIENCY_LABELS[skill.proficiency]}
                    </span>
                    {skill.tags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted/80"
                        onClick={() => setFilterTag(tag)}
                        title={`Filter by ${tag}`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {skill.date ? `Learned: ${skill.date}` : ""}
                    {skill.date ? " · " : ""}
                    Added {new Date(skill.createdAt).toLocaleDateString()}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isPending}
                    onClick={() => startEdit(skill)}
                    aria-label={`Edit ${skill.name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={isPending}
                    onClick={() => handleDelete(skill.id)}
                    aria-label={`Delete ${skill.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
