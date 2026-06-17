"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { connectToDatabase } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { OneOnOne, type OneOnOneDoc } from "@/lib/models/one-on-one";
import type { OneOnOne as OneOnOneDTO } from "@/lib/types";

const ROUTE = "/dashboard/one-on-one";

const oneOnOneSchema = z.object({
  documentDate: z.string().min(1, "Document date is required."),
  businessPartnerWork: z.string().nullish(),
  workloadConcerns: z.string().nullish(),
  tdpContributions: z.string().nullish(),
  utilizationPercentage: z.number().min(0).max(100).nullish(),
  trainingSkills: z.string().nullish(),
  pursuingDegrees: z.string().nullish(),
  compliancePercentage: z.number().min(0).max(100).nullish(),
  ehsTrainingPercentage: z.number().min(0).max(100).nullish(),
  growthHubProgress: z.string().nullish(),
  successPathwaysUpdated: z.boolean().optional(),
  contingencyTrainingPercentage: z.number().min(0).max(100).nullish(),
  innovationEvents: z.string().nullish(),
  accomplishments: z.string().nullish(),
  challenges: z.string().nullish(),
  goals: z.string().nullish(),
  questions: z.string().nullish(),
  receivingSupport: z.string().nullish(),
  additionalItems: z.string().nullish(),
  outOfOfficePlans: z.string().nullish(),
});

/**
 * Serialize a one-on-one document into its DTO.
 * @param doc The Mongoose document.
 * @returns The serializable one-on-one.
 */
function toDTO(doc: OneOnOneDoc): OneOnOneDTO {
  return {
    id: doc._id.toString(),
    documentDate: doc.documentDate,
    businessPartnerWork: doc.businessPartnerWork ?? null,
    workloadConcerns: doc.workloadConcerns ?? null,
    tdpContributions: doc.tdpContributions ?? null,
    utilizationPercentage: doc.utilizationPercentage ?? null,
    trainingSkills: doc.trainingSkills ?? null,
    pursuingDegrees: doc.pursuingDegrees ?? null,
    compliancePercentage: doc.compliancePercentage ?? null,
    ehsTrainingPercentage: doc.ehsTrainingPercentage ?? null,
    growthHubProgress: doc.growthHubProgress ?? null,
    successPathwaysUpdated: Boolean(doc.successPathwaysUpdated),
    contingencyTrainingPercentage: doc.contingencyTrainingPercentage ?? null,
    innovationEvents: doc.innovationEvents ?? null,
    accomplishments: doc.accomplishments ?? null,
    challenges: doc.challenges ?? null,
    goals: doc.goals ?? null,
    questions: doc.questions ?? null,
    receivingSupport: doc.receivingSupport ?? null,
    additionalItems: doc.additionalItems ?? null,
    outOfOfficePlans: doc.outOfOfficePlans ?? null,
    createdAt: (doc.createdAt as Date).toISOString(),
    updatedAt: (doc.updatedAt as Date).toISOString(),
  };
}

/**
 * List the current user's one-on-one documents, newest first.
 * @returns The user's one-on-ones sorted by documentDate descending.
 */
export async function getOneOnOnes(): Promise<OneOnOneDTO[]> {
  const userId = await requireUserId();
  await connectToDatabase();
  const docs = await OneOnOne.find({ userId }).sort({ documentDate: -1 });
  return docs.map(toDTO);
}

/**
 * Create a one-on-one document for the current user.
 * @param input The new one-on-one fields.
 * @returns The created one-on-one.
 */
export async function createOneOnOne(input: unknown): Promise<OneOnOneDTO> {
  const userId = await requireUserId();
  const data = oneOnOneSchema.parse(input);
  await connectToDatabase();
  const doc = await OneOnOne.create({ ...data, userId });
  revalidatePath(ROUTE);
  return toDTO(doc);
}

/**
 * Update one of the current user's one-on-one documents.
 * @param id The one-on-one id.
 * @param input The updated fields.
 * @returns The updated one-on-one, or null if not found.
 */
export async function updateOneOnOne(
  id: string,
  input: unknown,
): Promise<OneOnOneDTO | null> {
  const userId = await requireUserId();
  const data = oneOnOneSchema.parse(input);
  await connectToDatabase();
  const doc = await OneOnOne.findOneAndUpdate({ _id: id, userId }, data, {
    new: true,
  });
  revalidatePath(ROUTE);
  return doc ? toDTO(doc) : null;
}

/**
 * Delete one of the current user's one-on-one documents.
 * @param id The one-on-one id.
 * @returns Nothing.
 */
export async function deleteOneOnOne(id: string): Promise<void> {
  const userId = await requireUserId();
  await connectToDatabase();
  await OneOnOne.deleteOne({ _id: id, userId });
  revalidatePath(ROUTE);
}
