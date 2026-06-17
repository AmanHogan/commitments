"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { connectToDatabase } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import {
  DevelopmentCommitmentOne,
  type DevelopmentCommitmentOneDoc,
} from "@/lib/models/development-commitment-one";
import type {
  DevelopmentCommitmentOne as DCommOneDTO,
  LearningModule,
} from "@/lib/types";

const ROUTE = "/dashboard/development-commitments-one";

const moduleSchema = z.object({
  moduleName: z.string().min(1),
  type: z.string().nullish(),
  hours: z.number().nullish(),
  dateStarted: z.string().nullish(),
  dateFinished: z.string().nullish(),
  finished: z.boolean().optional(),
  required: z.boolean().optional(),
  description: z.string().nullish(),
});

const commitmentSchema = z.object({
  itemName: z.string().min(1, "Name is required."),
  description: z.string().nullish(),
  itemDate: z.string().nullish(),
  dateCompleted: z.string().nullish(),
  modules: z.array(moduleSchema).optional(),
});

/**
 * Serialize a development commitment document into its DTO.
 * @param doc The Mongoose document.
 * @returns The serializable commitment.
 */
function toDTO(doc: DevelopmentCommitmentOneDoc): DCommOneDTO {
  const modules: LearningModule[] = (doc.modules ?? []).map((mod) => ({
    id: mod._id.toString(),
    moduleName: mod.moduleName,
    type: mod.type ?? null,
    hours: mod.hours ?? null,
    dateStarted: mod.dateStarted ?? null,
    dateFinished: mod.dateFinished ?? null,
    finished: Boolean(mod.finished),
    required: Boolean(mod.required),
    description: mod.description ?? null,
  }));
  return {
    id: doc._id.toString(),
    itemName: doc.itemName,
    description: doc.description ?? null,
    itemDate: doc.itemDate ?? null,
    dateCompleted: doc.dateCompleted ?? null,
    modules,
    createdAt: (doc.createdAt as Date).toISOString(),
    updatedAt: (doc.updatedAt as Date).toISOString(),
  };
}

/**
 * List the current user's development commitments, newest first.
 * @returns The user's commitments.
 */
export async function getDevelopmentCommitments(): Promise<DCommOneDTO[]> {
  const userId = await requireUserId();
  await connectToDatabase();
  const docs = await DevelopmentCommitmentOne.find({ userId }).sort({
    createdAt: -1,
  });
  return docs.map(toDTO);
}

/**
 * Create a development commitment for the current user.
 * @param input The new commitment fields.
 * @returns The created commitment.
 */
export async function createDevelopmentCommitment(
  input: unknown,
): Promise<DCommOneDTO> {
  const userId = await requireUserId();
  const data = commitmentSchema.parse(input);
  await connectToDatabase();
  const doc = await DevelopmentCommitmentOne.create({ ...data, userId });
  revalidatePath(ROUTE);
  return toDTO(doc);
}

/**
 * Update one of the current user's development commitments (with modules).
 * @param id The commitment id.
 * @param input The updated fields.
 * @returns The updated commitment, or null if not found.
 */
export async function updateDevelopmentCommitment(
  id: string,
  input: unknown,
): Promise<DCommOneDTO | null> {
  const userId = await requireUserId();
  const data = commitmentSchema.parse(input);
  await connectToDatabase();
  const doc = await DevelopmentCommitmentOne.findOneAndUpdate(
    { _id: id, userId },
    data,
    { new: true },
  );
  revalidatePath(ROUTE);
  return doc ? toDTO(doc) : null;
}

/**
 * Delete one of the current user's development commitments.
 * @param id The commitment id.
 * @returns Nothing.
 */
export async function deleteDevelopmentCommitment(id: string): Promise<void> {
  const userId = await requireUserId();
  await connectToDatabase();
  await DevelopmentCommitmentOne.deleteOne({ _id: id, userId });
  revalidatePath(ROUTE);
}

/**
 * Bulk-create development commitments from imported JSON records.
 * Each record is validated through commitmentSchema before insertion.
 * @param records The raw parsed records from the import file.
 * @returns The number of records successfully created.
 */
export async function bulkCreateDevelopmentCommitments(
  records: unknown[],
): Promise<{ created: number }> {
  const userId = await requireUserId();
  await connectToDatabase();
  let created = 0;
  for (const raw of records) {
    const parsed = commitmentSchema.safeParse(raw);
    if (parsed.success) {
      await DevelopmentCommitmentOne.create({ ...parsed.data, userId });
      created++;
    }
  }
  revalidatePath(ROUTE);
  return { created };
}
