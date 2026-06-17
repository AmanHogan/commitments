"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { connectToDatabase } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { ResumeFile, type ResumeFileDoc } from "@/lib/models/resume-file";
import type { ResumeFileMeta } from "@/lib/types";

const ROUTE = "/dashboard/resume";

/**
 * Serialize a resume file document into its client metadata DTO (no bytes).
 * @param doc The Mongoose document.
 * @returns The serializable metadata.
 */
function toMeta(doc: ResumeFileDoc): ResumeFileMeta {
  return {
    id: doc._id.toString(),
    label: doc.label ?? "",
    originalName: doc.originalName ?? "",
    contentType: doc.contentType ?? "application/pdf",
    size: doc.size ?? 0,
    createdAt: (doc.createdAt as Date).toISOString(),
    updatedAt: (doc.updatedAt as Date).toISOString(),
  };
}

/**
 * List the current user's resume files (metadata only), newest first.
 * @returns The user's resume file metadata.
 */
export async function getResumeFiles(): Promise<ResumeFileMeta[]> {
  const userId = await requireUserId();
  await connectToDatabase();
  const docs = await ResumeFile.find({ userId })
    .select("-data")
    .sort({ createdAt: -1 });
  return docs.map(toMeta);
}

/**
 * Rename a resume file's label.
 * @param id The resume file id.
 * @param label The new label.
 * @returns The updated metadata, or null if not found.
 */
export async function updateResumeLabel(
  id: string,
  label: string,
): Promise<ResumeFileMeta | null> {
  const userId = await requireUserId();
  const clean = z.string().max(200).parse(label);
  await connectToDatabase();
  const doc = await ResumeFile.findOneAndUpdate(
    { _id: id, userId },
    { label: clean },
    { new: true, projection: "-data" },
  );
  revalidatePath(ROUTE);
  return doc ? toMeta(doc) : null;
}

/**
 * Delete one of the current user's resume files.
 * @param id The resume file id.
 * @returns Nothing.
 */
export async function deleteResumeFile(id: string): Promise<void> {
  const userId = await requireUserId();
  await connectToDatabase();
  await ResumeFile.deleteOne({ _id: id, userId });
  revalidatePath(ROUTE);
}
