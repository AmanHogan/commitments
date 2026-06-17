"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { connectToDatabase } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { FcSkill, type FcSkillDoc } from "@/lib/models/fc-skill";
import { FlashCardSet, type FlashCardSetDoc } from "@/lib/models/flash-card-set";
import type { FcSkill as FcSkillDTO, FlashCardSet as FlashCardSetDTO } from "@/lib/types";

const ROUTE = "/dashboard/flashcards/skills";

const fcSkillSchema = z.object({
  name: z.string().min(1, "Name is required."),
  proficiency: z.number().min(1).max(5).optional(),
  date: z.string().nullish(),
  flashCardSetId: z.string().nullish(),
});

/**
 * Serialize an fc-skill document into its DTO.
 * @param doc The Mongoose document.
 * @param setTitle The linked set title, if any.
 * @returns The serializable fc-skill.
 */
function toDTO(doc: FcSkillDoc, setTitle: string | null): FcSkillDTO {
  return {
    id: doc._id.toString(),
    name: doc.name,
    proficiency: doc.proficiency ?? 3,
    date: doc.date ?? null,
    flashCardSetId: doc.flashCardSetId?.toString() ?? null,
    flashCardSetTitle: setTitle,
    createdAt: (doc.createdAt as Date).toISOString(),
    updatedAt: (doc.updatedAt as Date).toISOString(),
  };
}

/**
 * List the current user's fc-skills with their linked set titles.
 * @returns The user's fc-skills sorted by proficiency descending.
 */
export async function getFcSkills(): Promise<FcSkillDTO[]> {
  const userId = await requireUserId();
  await connectToDatabase();
  const skills = await FcSkill.find({ userId }).sort({ proficiency: -1 });
  const setIds = skills
    .map((s) => s.flashCardSetId?.toString())
    .filter((id): id is string => Boolean(id));
  const sets = setIds.length
    ? await FlashCardSet.find({ _id: { $in: setIds } }).select("title")
    : [];
  const setMap = new Map<string, string>(
    (sets as FlashCardSetDoc[]).map((s) => [s._id.toString(), s.title]),
  );
  return skills.map((s) => toDTO(s, s.flashCardSetId ? (setMap.get(s.flashCardSetId.toString()) ?? null) : null));
}

/**
 * Get the current user's flash card sets (for the set picker in the form).
 * @returns A slim list of set id + title pairs.
 */
export async function getSetOptions(): Promise<Pick<FlashCardSetDTO, "id" | "title">[]> {
  const userId = await requireUserId();
  await connectToDatabase();
  const docs = await FlashCardSet.find({ userId }).sort({ title: 1 }).select("title");
  return (docs as FlashCardSetDoc[]).map((d) => ({ id: d._id.toString(), title: d.title }));
}

/**
 * Create an fc-skill for the current user.
 * @param input The new fc-skill fields.
 * @returns The created fc-skill.
 */
export async function createFcSkill(input: unknown): Promise<FcSkillDTO> {
  const userId = await requireUserId();
  const data = fcSkillSchema.parse(input);
  await connectToDatabase();
  const doc = await FcSkill.create({ ...data, userId });
  let setTitle: string | null = null;
  if (data.flashCardSetId) {
    const set = await FlashCardSet.findById(data.flashCardSetId).select("title");
    setTitle = (set as FlashCardSetDoc | null)?.title ?? null;
  }
  revalidatePath(ROUTE);
  return toDTO(doc, setTitle);
}

/**
 * Update one of the current user's fc-skills.
 * @param id The fc-skill id.
 * @param input The updated fields.
 * @returns The updated fc-skill, or null if not found.
 */
export async function updateFcSkill(
  id: string,
  input: unknown,
): Promise<FcSkillDTO | null> {
  const userId = await requireUserId();
  const data = fcSkillSchema.parse(input);
  await connectToDatabase();
  const doc = await FcSkill.findOneAndUpdate({ _id: id, userId }, data, { new: true });
  if (!doc) return null;
  let setTitle: string | null = null;
  if (doc.flashCardSetId) {
    const set = await FlashCardSet.findById(doc.flashCardSetId).select("title");
    setTitle = (set as FlashCardSetDoc | null)?.title ?? null;
  }
  revalidatePath(ROUTE);
  return toDTO(doc, setTitle);
}

/**
 * Delete one of the current user's fc-skills.
 * @param id The fc-skill id.
 * @returns Nothing.
 */
export async function deleteFcSkill(id: string): Promise<void> {
  const userId = await requireUserId();
  await connectToDatabase();
  await FcSkill.deleteOne({ _id: id, userId });
  revalidatePath(ROUTE);
}
