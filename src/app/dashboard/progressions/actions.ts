"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { connectToDatabase } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { Progression, type ProgressionDoc } from "@/lib/models/progression";
import type {
  Progression as ProgressionDTO,
  StarEntry,
  DevelopmentEntry,
} from "@/lib/types";

const ROUTE = "/dashboard/progressions";

const starEntrySchema = z.object({
  sourceType: z.enum(["bcomm1", "bcomm2", "dcomm2"]).nullish(),
  sourceId: z.string().nullish(),
  title: z.string().min(1, "Title is required."),
  situation: z.string().default(""),
  task: z.string().default(""),
  action: z.string().default(""),
  result: z.string().default(""),
});

const developmentEntrySchema = z.object({
  sourceId: z.string().nullish(),
  title: z.string().min(1, "Title is required."),
  body: z.string().default(""),
  hours: z.number().nullish(),
});

const progressionSchema = z.object({
  title: z.string().min(1, "Title is required."),
  businessEntries: z.array(starEntrySchema).default([]),
  programEntries: z.array(starEntrySchema).default([]),
  developmentEntries: z.array(developmentEntrySchema).default([]),
});

/**
 * Serialize a progression document into its client DTO.
 * @param doc The Mongoose document.
 * @returns The serializable progression.
 */
function toDTO(doc: ProgressionDoc): ProgressionDTO {
  const mapStar = (e: ProgressionDoc["businessEntries"][number]): StarEntry => ({
    id: e._id.toString(),
    sourceType: e.sourceType ?? null,
    sourceId: e.sourceId ?? null,
    title: e.title,
    situation: e.situation ?? "",
    task: e.task ?? "",
    action: e.action ?? "",
    result: e.result ?? "",
  });
  const mapDev = (
    e: ProgressionDoc["developmentEntries"][number],
  ): DevelopmentEntry => ({
    id: e._id.toString(),
    sourceId: e.sourceId ?? null,
    title: e.title,
    body: e.body ?? "",
    hours: e.hours ?? null,
  });
  return {
    id: doc._id.toString(),
    title: doc.title,
    businessEntries: (doc.businessEntries ?? []).map(mapStar),
    programEntries: (doc.programEntries ?? []).map(mapStar),
    developmentEntries: (doc.developmentEntries ?? []).map(mapDev),
    createdAt: (doc.createdAt as Date).toISOString(),
    updatedAt: (doc.updatedAt as Date).toISOString(),
  };
}

/**
 * List the current user's progressions, newest first.
 * @returns The user's progressions.
 */
export async function getProgressions(): Promise<ProgressionDTO[]> {
  const userId = await requireUserId();
  await connectToDatabase();
  const docs = await Progression.find({ userId }).sort({ createdAt: -1 });
  return docs.map(toDTO);
}

/**
 * Create a progression for the current user.
 * @param input The progression fields.
 * @returns The created progression.
 */
export async function createProgression(input: unknown): Promise<ProgressionDTO> {
  const userId = await requireUserId();
  const data = progressionSchema.parse(input);
  await connectToDatabase();
  const doc = await Progression.create({ ...data, userId });
  revalidatePath(ROUTE);
  return toDTO(doc);
}

/**
 * Update (replace) one of the current user's progressions.
 * @param id The progression id.
 * @param input The updated fields.
 * @returns The updated progression, or null if not found.
 */
export async function updateProgression(
  id: string,
  input: unknown,
): Promise<ProgressionDTO | null> {
  const userId = await requireUserId();
  const data = progressionSchema.parse(input);
  await connectToDatabase();
  const doc = await Progression.findOneAndUpdate({ _id: id, userId }, data, {
    new: true,
  });
  revalidatePath(ROUTE);
  return doc ? toDTO(doc) : null;
}

/**
 * Delete one of the current user's progressions.
 * @param id The progression id.
 * @returns Nothing.
 */
export async function deleteProgression(id: string): Promise<void> {
  const userId = await requireUserId();
  await connectToDatabase();
  await Progression.deleteOne({ _id: id, userId });
  revalidatePath(ROUTE);
}
