"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Trash2, Pencil } from "lucide-react";
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
import type { FcSkill, CreateFcSkillInput, FlashCardSet } from "@/lib/types";
import { createFcSkill, updateFcSkill, deleteFcSkill } from "./actions";

const PROFICIENCY_LABELS: Record<number, string> = {
  1: "1 — Beginner",
  2: "2 — Basic",
  3: "3 — Intermediate",
  4: "4 — Advanced",
  5: "5 — Expert",
};

const PROFICIENCY_COLORS: Record<number, string> = {
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
  flashCardSetId: string;
}

/**
 * Build an empty fc-skill form state.
 * @returns A blank form.
 */
function emptyForm(): FormState {
  return { name: "", proficiency: "3", date: "", flashCardSetId: "" };
}

/**
 * Convert form state to an action input payload.
 * @param form The form state.
 * @returns The create/update input.
 */
function toInput(form: FormState): CreateFcSkillInput {
  return {
    name: form.name.trim(),
    proficiency: parseInt(form.proficiency, 10),
    date: form.date || null,
    flashCardSetId: form.flashCardSetId || null,
  };
}

/**
 * Interactive manager for flashcard skills: create, edit, delete with set linkage.
 * @param props Contains `initialSkills` and `setOptions` for the set picker.
 * @returns The rendered client UI.
 */
export function FcSkillsClient({
  initialSkills,
  setOptions,
}: {
  initialSkills: FcSkill[];
  setOptions: Pick<FlashCardSet, "id" | "title">[];
}): React.JSX.Element {
  const [skills, setSkills] = useState<FcSkill[]>(initialSkills);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  /**
   * Submit the form to create or update a skill.
   * @param event The form event.
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
          const updated = await updateFcSkill(editingId, payload);
          if (updated) {
            setSkills((prev) => prev.map((s) => (s.id === editingId ? updated : s)));
          }
          setEditingId(null);
        } else {
          const created = await createFcSkill(payload);
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
  function startEdit(skill: FcSkill): void {
    setEditingId(skill.id);
    setForm({
      name: skill.name,
      proficiency: skill.proficiency.toString(),
      date: skill.date ?? "",
      flashCardSetId: skill.flashCardSetId ?? "",
    });
  }

  /**
   * Delete a skill.
   * @param id The skill id.
   * @returns Nothing.
   */
  function handleDelete(id: string): void {
    startTransition(async () => {
      try {
        await deleteFcSkill(id);
        setSkills((prev) => prev.filter((s) => s.id !== id));
      } catch {
        setError("Could not delete skill.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Edit skill" : "Add skill"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <Label>Proficiency</Label>
                <Select
                  value={form.proficiency}
                  onValueChange={(v) =>
                    setForm((prev) => ({ ...prev, proficiency: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <SelectItem key={n} value={n.toString()}>
                        {PROFICIENCY_LABELS[n]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={form.date}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, date: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Label>Linked Set</Label>
              <Select
                value={form.flashCardSetId}
                onValueChange={(v) =>
                  setForm((prev) => ({ ...prev, flashCardSetId: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {setOptions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}
            <div className="flex gap-2">
              <Button type="submit" disabled={isPending}>
                {editingId ? "Save changes" : "Add skill"}
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

      <div className="flex flex-col gap-2">
        {skills.length === 0 ? (
          <p className="text-sm text-muted-foreground">No skills yet.</p>
        ) : (
          skills.map((skill) => (
            <Card key={skill.id}>
              <CardContent className="flex items-center justify-between gap-4 pt-4">
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="font-medium">{skill.name}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span
                      className={`rounded-full px-2 py-0.5 font-semibold ${PROFICIENCY_COLORS[skill.proficiency] ?? ""}`}
                    >
                      {PROFICIENCY_LABELS[skill.proficiency]}
                    </span>
                    {skill.date ? <span>{skill.date}</span> : null}
                    {skill.flashCardSetTitle ? (
                      <span>Set: {skill.flashCardSetTitle}</span>
                    ) : null}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isPending}
                    onClick={() => startEdit(skill)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={isPending}
                    onClick={() => handleDelete(skill.id)}
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
