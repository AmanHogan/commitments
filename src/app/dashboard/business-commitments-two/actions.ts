"use server";

import { BusinessCommitmentTwo } from "@/lib/models/business-commitment-two";
import {
  listEventCommitments,
  createEventCommitment,
  updateEventCommitment,
  deleteEventCommitment,
} from "@/lib/event-commitment-service";
import type { EventCommitment } from "@/lib/types";

const ROUTE = "/dashboard/business-commitments-two";

/**
 * List the current user's TDP program impact commitments.
 * @returns The user's event commitments.
 */
export async function getItems(): Promise<EventCommitment[]> {
  return listEventCommitments(BusinessCommitmentTwo);
}

/**
 * Create a TDP program impact commitment.
 * @param input The new event fields.
 * @returns The created event commitment.
 */
export async function createItem(input: unknown): Promise<EventCommitment> {
  return createEventCommitment(BusinessCommitmentTwo, input, ROUTE);
}

/**
 * Update a TDP program impact commitment.
 * @param id The event id.
 * @param input The updated fields.
 * @returns The updated event commitment, or null if not found.
 */
export async function updateItem(
  id: string,
  input: unknown,
): Promise<EventCommitment | null> {
  return updateEventCommitment(BusinessCommitmentTwo, id, input, ROUTE);
}

/**
 * Delete a TDP program impact commitment.
 * @param id The event id.
 * @returns Nothing.
 */
export async function deleteItem(id: string): Promise<void> {
  return deleteEventCommitment(BusinessCommitmentTwo, id, ROUTE);
}
