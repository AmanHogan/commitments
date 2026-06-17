"use client";

import { useState } from "react";
import { Trash2, ChevronDown, ChevronUp, Eye, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import type { StarEntry } from "@/lib/types";
import { starToParagraph, starCharCount } from "@/lib/star";

/** Field-level guidance shown under each STAR textarea. */
const STAR_HINTS: Record<"situation" | "task" | "action" | "result", string> = {
  situation: "Context and stakes — WHO is affected, at what SCALE, what's at RISK.",
  task: "Your specific responsibility — what were YOU asked to deliver?",
  action: "What you did — specific actions, use \"I\" not \"we\".",
  result: "Measurable outcome — lead with a NUMBER, then the business value.",
};

interface StarEntryEditorProps {
  entry: StarEntry;
  /** Called with the updated entry whenever any field changes. */
  onChange: (entry: StarEntry) => void;
  /** Called when the user removes this entry from the section. */
  onRemove: () => void;
  /** Optional 1-based position label shown in the header. */
  index?: number;
}

/**
 * A single STAR field (label + textarea + hint + char count).
 * @param props The field key, value, hint, and change handler.
 * @returns The rendered field.
 */
function StarField({
  id,
  label,
  value,
  hint,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  hint: string;
  onChange: (value: string) => void;
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <Label htmlFor={id}>{label}</Label>
        <span className="text-[0.7rem] text-muted-foreground">{value.length} chars</span>
      </div>
      <Textarea
        id={id}
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <p className="text-[0.7rem] leading-tight text-muted-foreground">{hint}</p>
    </div>
  );
}

/**
 * Reusable editor for one STAR-formatted accomplishment. Provides Title plus
 * Situation/Task/Action/Result fields, an optional paragraph preview, a running
 * character count toward the 4,000-char section limit, and a remove control.
 * This is the building block for the Progressions Business and Program sections.
 * @param props The entry, change/remove handlers, and optional index.
 * @returns The rendered STAR entry editor card.
 */
export function StarEntryEditor({
  entry,
  onChange,
  onRemove,
  index,
}: StarEntryEditorProps): React.JSX.Element {
  const [collapsed, setCollapsed] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  /**
   * Patch a single field on the entry and bubble up the change.
   * @param field The STAR entry field to update.
   * @param value The new string value.
   * @returns Nothing.
   */
  function patch(field: keyof StarEntry, value: string): void {
    onChange({ ...entry, [field]: value });
  }

  const chars = starCharCount(entry);

  return (
    <Card className="border-l-4 border-l-primary/60">
      <CardContent className="flex flex-col gap-3 pt-4">
        {/* Header */}
        <div className="flex items-start gap-2">
          <GripVertical className="mt-2 h-4 w-4 shrink-0 cursor-grab text-muted-foreground" />
          <div className="flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <Label htmlFor={`title-${entry.id}`}>
                {index ? `${index}. ` : ""}Title
              </Label>
              {entry.sourceType ? (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[0.7rem] text-muted-foreground">
                  imported · {entry.sourceType}
                </span>
              ) : (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[0.7rem] text-muted-foreground">
                  manual
                </span>
              )}
            </div>
            <Input
              id={`title-${entry.id}`}
              className="mt-1"
              value={entry.title}
              onChange={(e) => patch("title", e.target.value)}
              placeholder="Short accomplishment title"
            />
          </div>
          <div className="flex shrink-0 gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => setShowPreview((v) => !v)}
              aria-label="Toggle preview"
              title="Preview as paragraph"
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => setCollapsed((v) => !v)}
              aria-label={collapsed ? "Expand" : "Collapse"}
            >
              {collapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={onRemove}
              aria-label="Remove entry"
            >
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        </div>

        {/* STAR fields */}
        {!collapsed ? (
          <div className="flex flex-col gap-3 pl-6">
            <StarField
              id={`situation-${entry.id}`}
              label="Situation"
              value={entry.situation}
              hint={STAR_HINTS.situation}
              onChange={(v) => patch("situation", v)}
            />
            <StarField
              id={`task-${entry.id}`}
              label="Task"
              value={entry.task}
              hint={STAR_HINTS.task}
              onChange={(v) => patch("task", v)}
            />
            <StarField
              id={`action-${entry.id}`}
              label="Action"
              value={entry.action}
              hint={STAR_HINTS.action}
              onChange={(v) => patch("action", v)}
            />
            <StarField
              id={`result-${entry.id}`}
              label="Result"
              value={entry.result}
              hint={STAR_HINTS.result}
              onChange={(v) => patch("result", v)}
            />
          </div>
        ) : null}

        {/* Paragraph preview */}
        {showPreview ? (
          <div className="ml-6 rounded-lg border border-dashed border-border bg-muted/40 p-3">
            <p className="mb-1 text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
              Submission preview
            </p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {starToParagraph(entry) || (
                <span className="text-muted-foreground">Nothing to preview yet.</span>
              )}
            </p>
          </div>
        ) : null}

        {/* Footer: char count */}
        <div className="ml-6 flex justify-end">
          <span className="text-[0.7rem] text-muted-foreground">
            {chars.toLocaleString()} chars in this entry
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
