"use server";

import { DevelopmentCommitmentTwo } from "@/lib/models/development-commitment-two";
import {
  listEventCommitments,
  createEventCommitment,
  updateEventCommitment,
  deleteEventCommitment,
  bulkCreateEventCommitments,
} from "@/lib/event-commitment-service";
import type { EventCommitment } from "@/lib/types";

const ROUTE = "/dashboard/development-commitments-two";

/**
 * List the current user's innovation commitments.
 * @returns The user's event commitments.
 */
export async function getItems(): Promise<EventCommitment[]> {
  return listEventCommitments(DevelopmentCommitmentTwo);
}

/**
 * Create an innovation commitment.
 * @param input The new event fields.
 * @returns The created event commitment.
 */
export async function createItem(input: unknown): Promise<EventCommitment> {
  return createEventCommitment(DevelopmentCommitmentTwo, input, ROUTE);
}

/**
 * Update an innovation commitment.
 * @param id The event id.
 * @param input The updated fields.
 * @returns The updated event commitment, or null if not found.
 */
export async function updateItem(
  id: string,
  input: unknown,
): Promise<EventCommitment | null> {
  return updateEventCommitment(DevelopmentCommitmentTwo, id, input, ROUTE);
}

/**
 * Delete an innovation commitment.
 * @param id The event id.
 * @returns Nothing.
 */
export async function deleteItem(id: string): Promise<void> {
  return deleteEventCommitment(DevelopmentCommitmentTwo, id, ROUTE);
}

/**
 * Bulk-create innovation commitments from imported JSON records.
 * @param records The raw parsed records from the import file.
 * @returns The number of records created.
 */
export async function bulkCreateItems(
  records: unknown[],
): Promise<{ created: number }> {
  return bulkCreateEventCommitments(DevelopmentCommitmentTwo, records, ROUTE);
}
