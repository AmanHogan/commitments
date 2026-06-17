"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { connectToDatabase } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { Skill, type SkillDoc } from "@/lib/models/skill";
import type { Skill as SkillDTO } from "@/lib/types";

const skillSchema = z.object({
  name: z.string().min(1, "Name is required."),
  proficiency: z.number().int().min(1).max(5),
  date: z.string().nullish(),
  tags: z.array(z.string()).default([]),
});

/**
 * Convert a Skill document into the client-facing DTO.
 * @param doc The Mongoose skill document.
 * @returns The serializable skill.
 */
function toDTO(doc: SkillDoc): SkillDTO {
  return {
    id: doc._id.toString(),
    name: doc.name,
    proficiency: doc.proficiency,
    date: doc.date ?? null,
    tags: doc.tags ?? [],
    createdAt: (doc.createdAt as Date).toISOString(),
    updatedAt: (doc.updatedAt as Date).toISOString(),
  };
}

/**
 * List all skills for the current user, highest proficiency first.
 * @returns The user's skills.
 */
export async function getSkills(): Promise<SkillDTO[]> {
  const userId = await requireUserId();
  await connectToDatabase();
  const docs = await Skill.find({ userId }).sort({ proficiency: -1 }).lean<SkillDoc[]>();
  return docs.map(toDTO);
}

/**
 * Create a skill for the current user.
 * @param input The new skill fields.
 * @returns The created skill.
 */
export async function createSkill(input: unknown): Promise<SkillDTO> {
  const userId = await requireUserId();
  const data = skillSchema.parse(input);
  await connectToDatabase();
  const doc = await Skill.create({ ...data, userId });
  revalidatePath("/dashboard/skills");
  return toDTO(doc);
}

/**
 * Update one of the current user's skills.
 * @param id The skill id.
 * @param input The fields to update.
 * @returns The updated skill, or null if not found.
 */
export async function updateSkill(
  id: string,
  input: unknown,
): Promise<SkillDTO | null> {
  const userId = await requireUserId();
  const data = skillSchema.partial().parse(input);
  await connectToDatabase();
  const doc = await Skill.findOneAndUpdate({ _id: id, userId }, data, {
    new: true,
  });
  revalidatePath("/dashboard/skills");
  return doc ? toDTO(doc) : null;
}

/**
 * Delete one of the current user's skills.
 * @param id The skill id.
 * @returns Nothing.
 */
export async function deleteSkill(id: string): Promise<void> {
  const userId = await requireUserId();
  await connectToDatabase();
  await Skill.deleteOne({ _id: id, userId });
  revalidatePath("/dashboard/skills");
}
