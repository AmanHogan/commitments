import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { Model } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import type { EventCommitmentDoc } from "@/lib/models/event-commitment";
import type { EventCommitment, EventSubItem } from "@/lib/types";

const subItemSchema = z.object({
  subEventName: z.string().min(1),
  description: z.string().nullish(),
  started: z.string().nullish(),
  finished: z.string().nullish(),
  done: z.boolean().optional(),
});

const eventSchema = z.object({
  eventName: z.string().min(1, "Event name is required."),
  type: z.string().nullish(),
  description: z.string().nullish(),
  started: z.string().nullish(),
  finished: z.string().nullish(),
  done: z.boolean().optional(),
  required: z.boolean().optional(),
  subItems: z.array(subItemSchema).optional(),
});

/**
 * Serialize an event-commitment document into its client DTO.
 * @param doc The Mongoose document.
 * @returns The serializable event commitment.
 */
function toDTO(doc: EventCommitmentDoc): EventCommitment {
  const subItems: EventSubItem[] = (doc.subItems ?? []).map((sub) => ({
    id: sub._id.toString(),
    subEventName: sub.subEventName,
    description: sub.description ?? null,
    started: sub.started ?? null,
    finished: sub.finished ?? null,
    done: Boolean(sub.done),
  }));
  return {
    id: doc._id.toString(),
    eventName: doc.eventName,
    type: doc.type ?? null,
    description: doc.description ?? null,
    started: doc.started ?? null,
    finished: doc.finished ?? null,
    done: Boolean(doc.done),
    required: Boolean(doc.required),
    subItems,
    createdAt: (doc.createdAt as Date).toISOString(),
    updatedAt: (doc.updatedAt as Date).toISOString(),
  };
}

/**
 * List the current user's event commitments for a model, newest first.
 * @param model The Mongoose model to query.
 * @returns The user's event commitments.
 */
export async function listEventCommitments(
  model: Model<EventCommitmentDoc>,
): Promise<EventCommitment[]> {
  const userId = await requireUserId();
  await connectToDatabase();
  const docs = await model.find({ userId }).sort({ createdAt: -1 });
  return docs.map(toDTO);
}

/**
 * Create an event commitment for the current user.
 * @param model The Mongoose model.
 * @param input The new event fields.
 * @param revalidate The route path to revalidate.
 * @returns The created event commitment.
 */
export async function createEventCommitment(
  model: Model<EventCommitmentDoc>,
  input: unknown,
  revalidate: string,
): Promise<EventCommitment> {
  const userId = await requireUserId();
  const data = eventSchema.parse(input);
  await connectToDatabase();
  const doc = await model.create({ ...data, userId });
  revalidatePath(revalidate);
  return toDTO(doc);
}

/**
 * Replace an event commitment (including its sub-items) for the current user.
 * @param model The Mongoose model.
 * @param id The document id.
 * @param input The updated event fields.
 * @param revalidate The route path to revalidate.
 * @returns The updated event commitment, or null if not found.
 */
export async function updateEventCommitment(
  model: Model<EventCommitmentDoc>,
  id: string,
  input: unknown,
  revalidate: string,
): Promise<EventCommitment | null> {
  const userId = await requireUserId();
  const data = eventSchema.parse(input);
  await connectToDatabase();
  const doc = await model.findOneAndUpdate({ _id: id, userId }, data, {
    new: true,
  });
  revalidatePath(revalidate);
  return doc ? toDTO(doc) : null;
}

/**
 * Delete an event commitment for the current user.
 * @param model The Mongoose model.
 * @param id The document id.
 * @param revalidate The route path to revalidate.
 * @returns Nothing.
 */
export async function deleteEventCommitment(
  model: Model<EventCommitmentDoc>,
  id: string,
  revalidate: string,
): Promise<void> {
  const userId = await requireUserId();
  await connectToDatabase();
  await model.deleteOne({ _id: id, userId });
  revalidatePath(revalidate);
}

/**
 * Bulk-create event commitments for the current user from an imported JSON array.
 * Each record is validated through the shared eventSchema before insertion.
 * @param model The Mongoose model.
 * @param records The raw parsed records from the import file.
 * @param revalidate The route path to revalidate.
 * @returns The number of records successfully created.
 */
export async function bulkCreateEventCommitments(
  model: Model<EventCommitmentDoc>,
  records: unknown[],
  revalidate: string,
): Promise<{ created: number }> {
  const userId = await requireUserId();
  await connectToDatabase();
  let created = 0;
  for (const raw of records) {
    const parsed = eventSchema.safeParse(raw);
    if (parsed.success) {
      await model.create({ ...parsed.data, userId });
      created++;
    }
  }
  revalidatePath(revalidate);
  return { created };
}
