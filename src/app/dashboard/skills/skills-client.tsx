"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import type { Skill } from "@/lib/types";
import { createSkill, deleteSkill } from "./actions";

/**
 * Interactive skills manager: add new skills and delete existing ones.
 * @param props Contains the server-loaded `initialSkills`.
 * @returns The rendered skills client UI.
 */
export function SkillsClient({
  initialSkills,
}: {
  initialSkills: Skill[];
}): React.JSX.Element {
  const [skills, setSkills] = useState<Skill[]>(initialSkills);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  /**
   * Submit the add-skill form and prepend the created skill to the list.
   * @param event The form submit event.
   * @returns Nothing.
   */
  function handleAdd(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setError(null);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("name") ?? "").trim();
    const proficiency = Number(formData.get("proficiency") ?? 3);
    const date = String(formData.get("date") ?? "");
    const tags = String(formData.get("tags") ?? "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    if (!name) {
      setError("Name is required.");
      return;
    }

    startTransition(async () => {
      try {
        const created = await createSkill({
          name,
          proficiency,
          date: date || null,
          tags,
        });
        setSkills((prev) => [created, ...prev]);
        form.reset();
      } catch {
        setError("Could not save skill.");
      }
    });
  }

  /**
   * Delete a skill and remove it from the list.
   * @param id The skill id to delete.
   * @returns Nothing.
   */
  function handleDelete(id: string): void {
    startTransition(async () => {
      try {
        await deleteSkill(id);
        setSkills((prev) => prev.filter((skill) => skill.id !== id));
      } catch {
        setError("Could not delete skill.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent>
          <form
            onSubmit={handleAdd}
            className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr_auto]"
          >
            <div className="flex flex-col gap-1">
              <Label htmlFor="name">Skill</Label>
              <Input id="name" name="name" placeholder="e.g. Kubernetes" required />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="proficiency">Level</Label>
              <Input
                id="proficiency"
                name="proficiency"
                type="number"
                min={1}
                max={5}
                defaultValue={3}
                className="w-20"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input id="tags" name="tags" placeholder="devops, infra" />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={isPending}>
                Add
              </Button>
            </div>
            <input type="hidden" name="date" value="" />
          </form>
          {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2">
        {skills.length === 0 ? (
          <p className="text-sm text-muted-foreground">No skills yet.</p>
        ) : (
          skills.map((skill) => (
            <Card key={skill.id} size="sm">
              <CardContent className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate font-medium">{skill.name}</p>
                  {skill.tags.length > 0 ? (
                    <p className="truncate text-xs text-muted-foreground">
                      {skill.tags.join(", ")}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    Level {skill.proficiency}/5
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleDelete(skill.id)}
                    disabled={isPending}
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
