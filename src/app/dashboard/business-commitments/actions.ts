"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { connectToDatabase } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import {
  BusinessCommitmentOne,
  type BusinessCommitmentOneDoc,
} from "@/lib/models/business-commitment-one";
import type { BusinessCommitmentOne as BCommOneDTO } from "@/lib/types";

const ROUTE = "/dashboard/business-commitments";

const valueEntrySchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
});

const bcommSchema = z.object({
  workItem: z.string().min(1, "Work item is required."),
  started: z.string().nullish(),
  dateCompleted: z.string().nullish(),
  applicationContext: z.string().nullish(),
  description: z.string().nullish(),
  problemOpportunity: z.string().nullish(),
  whoBenefited: z.string().nullish(),
  impact: z.string().nullish(),
  valueEntries: z.array(valueEntrySchema).optional(),
  alignment: z.string().nullish(),
  statusNotes: z.string().nullish(),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "FAILED"]).optional(),
});

/**
 * Serialize a business commitment document into its DTO.
 * @param doc The Mongoose document.
 * @returns The serializable commitment.
 */
function toDTO(doc: BusinessCommitmentOneDoc): BCommOneDTO {
  return {
    id: doc._id.toString(),
    workItem: doc.workItem,
    started: doc.started ?? null,
    dateCompleted: doc.dateCompleted ?? null,
    applicationContext: doc.applicationContext ?? null,
    description: doc.description ?? null,
    problemOpportunity: doc.problemOpportunity ?? null,
    whoBenefited: doc.whoBenefited ?? null,
    impact: doc.impact ?? null,
    valueEntries: (doc.valueEntries ?? []).map((entry) => ({
      label: entry.label,
      value: entry.value,
    })),
    alignment: doc.alignment ?? null,
    statusNotes: doc.statusNotes ?? null,
    status: doc.status,
    createdAt: (doc.createdAt as Date).toISOString(),
    updatedAt: (doc.updatedAt as Date).toISOString(),
  };
}

/**
 * List the current user's business commitments, newest first.
 * @returns The user's commitments.
 */
export async function getBusinessCommitments(): Promise<BCommOneDTO[]> {
  const userId = await requireUserId();
  await connectToDatabase();
  const docs = await BusinessCommitmentOne.find({ userId }).sort({
    createdAt: -1,
  });
  return docs.map(toDTO);
}

/**
 * Create a business commitment for the current user.
 * @param input The new commitment fields.
 * @returns The created commitment.
 */
export async function createBusinessCommitment(
  input: unknown,
): Promise<BCommOneDTO> {
  const userId = await requireUserId();
  const data = bcommSchema.parse(input);
  await connectToDatabase();
  const doc = await BusinessCommitmentOne.create({ ...data, userId });
  revalidatePath(ROUTE);
  return toDTO(doc);
}

/**
 * Update one of the current user's business commitments.
 * @param id The commitment id.
 * @param input The updated fields.
 * @returns The updated commitment, or null if not found.
 */
export async function updateBusinessCommitment(
  id: string,
  input: unknown,
): Promise<BCommOneDTO | null> {
  const userId = await requireUserId();
  const data = bcommSchema.parse(input);
  await connectToDatabase();
  const doc = await BusinessCommitmentOne.findOneAndUpdate(
    { _id: id, userId },
    data,
    { new: true },
  );
  revalidatePath(ROUTE);
  return doc ? toDTO(doc) : null;
}

/**
 * Delete one of the current user's business commitments.
 * @param id The commitment id.
 * @returns Nothing.
 */
export async function deleteBusinessCommitment(id: string): Promise<void> {
  const userId = await requireUserId();
  await connectToDatabase();
  await BusinessCommitmentOne.deleteOne({ _id: id, userId });
  revalidatePath(ROUTE);
}
