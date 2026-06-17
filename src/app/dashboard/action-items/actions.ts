"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { connectToDatabase } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { ActionItem, type ActionItemDoc } from "@/lib/models/action-item";
import type { ActionItem as ActionItemDTO } from "@/lib/types";

const ROUTE = "/dashboard/action-items";

const actionItemSchema = z.object({
  name: z.string().min(1, "Name is required."),
  description: z.string().nullish(),
  criticality: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).nullish(),
  dateStarted: z.string().nullish(),
  dateFinished: z.string().nullish(),
  dueDate: z.string().nullish(),
  dueTime: z.string().nullish(),
  completed: z.boolean().optional(),
});

/**
 * Serialize an action-item document into its DTO.
 * @param doc The Mongoose document.
 * @returns The serializable action item.
 */
function toDTO(doc: ActionItemDoc): ActionItemDTO {
  return {
    id: doc._id.toString(),
    name: doc.name,
    description: doc.description ?? null,
    criticality: doc.criticality ?? null,
    dateStarted: doc.dateStarted ?? null,
    dateFinished: doc.dateFinished ?? null,
    dueDate: doc.dueDate ?? null,
    dueTime: doc.dueTime ?? null,
    completed: Boolean(doc.completed),
    createdAt: (doc.createdAt as Date).toISOString(),
    updatedAt: (doc.updatedAt as Date).toISOString(),
  };
}

/**
 * List the current user's action items, newest first.
 * @returns The user's action items.
 */
export async function getActionItems(): Promise<ActionItemDTO[]> {
  const userId = await requireUserId();
  await connectToDatabase();
  const docs = await ActionItem.find({ userId }).sort({ createdAt: -1 });
  return docs.map(toDTO);
}

/**
 * Create an action item for the current user.
 * @param input The new action-item fields.
 * @returns The created action item.
 */
export async function createActionItem(
  input: unknown,
): Promise<ActionItemDTO> {
  const userId = await requireUserId();
  const data = actionItemSchema.parse(input);
  await connectToDatabase();
  const doc = await ActionItem.create({ ...data, userId });
  revalidatePath(ROUTE);
  return toDTO(doc);
}

/**
 * Update one of the current user's action items.
 * @param id The action-item id.
 * @param input The updated fields.
 * @returns The updated action item, or null if not found.
 */
export async function updateActionItem(
  id: string,
  input: unknown,
): Promise<ActionItemDTO | null> {
  const userId = await requireUserId();
  const data = actionItemSchema.parse(input);
  await connectToDatabase();
  const doc = await ActionItem.findOneAndUpdate({ _id: id, userId }, data, {
    new: true,
  });
  revalidatePath(ROUTE);
  return doc ? toDTO(doc) : null;
}

/**
 * Delete one of the current user's action items.
 * @param id The action-item id.
 * @returns Nothing.
 */
export async function deleteActionItem(id: string): Promise<void> {
  const userId = await requireUserId();
  await connectToDatabase();
  await ActionItem.deleteOne({ _id: id, userId });
  revalidatePath(ROUTE);
}
