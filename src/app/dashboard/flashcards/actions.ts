"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { connectToDatabase } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { FlashCardSet, type FlashCardDoc, type FlashCardSetDoc } from "@/lib/models/flash-card-set";
import type {
  FlashCard,
  FlashCardSet as FlashCardSetDTO,
  FlashCardSetWithCards,
  StarredSetGroup,
} from "@/lib/types";

const ROUTE = "/dashboard/flashcards";

const setSchema = z.object({
  title: z.string().min(1, "Title is required."),
  description: z.string().nullish(),
  topic: z.string().nullish(),
  tags: z.array(z.string()).optional(),
});

const cardSchema = z.object({
  term: z.string().min(1, "Term is required."),
  definition: z.string().min(1, "Definition is required."),
  sortOrder: z.number().optional(),
  groupName: z.string().nullish(),
  termImageUrl: z.string().nullish(),
  definitionImageUrl: z.string().nullish(),
  hint: z.string().nullish(),
  starred: z.boolean().optional(),
});

/**
 * Serialize a flash card subdocument into its DTO.
 * @param card The subdocument.
 * @returns The serializable flash card.
 */
function cardToDTO(card: FlashCardDoc): FlashCard {
  return {
    id: card._id.toString(),
    term: card.term,
    definition: card.definition,
    sortOrder: card.sortOrder ?? 0,
    groupName: card.groupName ?? null,
    termImageUrl: card.termImageUrl ?? null,
    definitionImageUrl: card.definitionImageUrl ?? null,
    hint: card.hint ?? null,
    starred: Boolean(card.starred),
    createdAt: (card.createdAt as Date).toISOString(),
    updatedAt: (card.updatedAt as Date).toISOString(),
  };
}

/**
 * Serialize a flash card set document (without cards) into its DTO.
 * @param doc The Mongoose document.
 * @returns The serializable flash card set.
 */
function setToDTO(doc: FlashCardSetDoc): FlashCardSetDTO {
  const cards = doc.cards as FlashCardDoc[];
  return {
    id: doc._id.toString(),
    title: doc.title,
    description: doc.description ?? null,
    topic: doc.topic ?? null,
    tags: doc.tags ?? [],
    timesStudied: doc.timesStudied ?? 0,
    cardCount: cards.length,
    createdAt: (doc.createdAt as Date).toISOString(),
    updatedAt: (doc.updatedAt as Date).toISOString(),
  };
}

/**
 * Serialize a flash card set document including its cards.
 * @param doc The Mongoose document.
 * @returns The serializable flash card set with cards.
 */
function setWithCardsToDTO(doc: FlashCardSetDoc): FlashCardSetWithCards {
  const cards = (doc.cards as FlashCardDoc[])
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  return {
    ...setToDTO(doc),
    cards: cards.map(cardToDTO),
  };
}

/**
 * List the current user's flash card sets, newest first.
 * @returns The user's flash card sets (no cards embedded).
 */
export async function getFlashCardSets(): Promise<FlashCardSetDTO[]> {
  const userId = await requireUserId();
  await connectToDatabase();
  const docs = await FlashCardSet.find({ userId }).sort({ createdAt: -1 });
  return docs.map(setToDTO);
}

/**
 * Get a single flash card set with all its cards.
 * @param setId The set id.
 * @returns The set with cards, or null if not found.
 */
export async function getFlashCardSet(
  setId: string,
): Promise<FlashCardSetWithCards | null> {
  const userId = await requireUserId();
  await connectToDatabase();
  const doc = await FlashCardSet.findOne({ _id: setId, userId });
  return doc ? setWithCardsToDTO(doc) : null;
}

/**
 * Create a new flash card set for the current user.
 * @param input The new set fields.
 * @returns The created set.
 */
export async function createFlashCardSet(
  input: unknown,
): Promise<FlashCardSetDTO> {
  const userId = await requireUserId();
  const data = setSchema.parse(input);
  await connectToDatabase();
  const doc = await FlashCardSet.create({ ...data, userId, cards: [] });
  revalidatePath(ROUTE);
  return setToDTO(doc);
}

/**
 * Update a flash card set's metadata (not its cards).
 * @param setId The set id.
 * @param input The updated fields.
 * @returns The updated set, or null if not found.
 */
export async function updateFlashCardSet(
  setId: string,
  input: unknown,
): Promise<FlashCardSetDTO | null> {
  const userId = await requireUserId();
  const data = setSchema.parse(input);
  await connectToDatabase();
  const doc = await FlashCardSet.findOneAndUpdate(
    { _id: setId, userId },
    { $set: { title: data.title, description: data.description, topic: data.topic, tags: data.tags } },
    { new: true },
  );
  revalidatePath(ROUTE);
  return doc ? setToDTO(doc) : null;
}

/**
 * Delete a flash card set and all its cards.
 * @param setId The set id.
 * @returns Nothing.
 */
export async function deleteFlashCardSet(setId: string): Promise<void> {
  const userId = await requireUserId();
  await connectToDatabase();
  await FlashCardSet.deleteOne({ _id: setId, userId });
  revalidatePath(ROUTE);
}

/**
 * Increment the timesStudied counter for a set.
 * @param setId The set id.
 * @returns Nothing.
 */
export async function incrementTimesStudied(setId: string): Promise<void> {
  const userId = await requireUserId();
  await connectToDatabase();
  await FlashCardSet.findOneAndUpdate(
    { _id: setId, userId },
    { $inc: { timesStudied: 1 } },
  );
  revalidatePath(`${ROUTE}/${setId}`);
}

/**
 * Add a card to a flash card set.
 * @param setId The set id.
 * @param input The new card fields.
 * @returns The updated set with cards.
 */
export async function addCard(
  setId: string,
  input: unknown,
): Promise<FlashCardSetWithCards | null> {
  const userId = await requireUserId();
  const data = cardSchema.parse(input);
  await connectToDatabase();
  const doc = await FlashCardSet.findOneAndUpdate(
    { _id: setId, userId },
    { $push: { cards: data } },
    { new: true },
  );
  revalidatePath(`${ROUTE}/${setId}`);
  return doc ? setWithCardsToDTO(doc) : null;
}

/**
 * Update a card within a flash card set.
 * @param setId The set id.
 * @param cardId The card id.
 * @param input The updated card fields.
 * @returns The updated set with cards.
 */
export async function updateCard(
  setId: string,
  cardId: string,
  input: unknown,
): Promise<FlashCardSetWithCards | null> {
  const userId = await requireUserId();
  const data = cardSchema.parse(input);
  await connectToDatabase();
  const doc = await FlashCardSet.findOneAndUpdate(
    { _id: setId, userId, "cards._id": cardId },
    {
      $set: {
        "cards.$.term": data.term,
        "cards.$.definition": data.definition,
        "cards.$.sortOrder": data.sortOrder ?? 0,
        "cards.$.groupName": data.groupName ?? null,
        "cards.$.termImageUrl": data.termImageUrl ?? null,
        "cards.$.definitionImageUrl": data.definitionImageUrl ?? null,
        "cards.$.hint": data.hint ?? null,
        "cards.$.starred": data.starred ?? false,
      },
    },
    { new: true },
  );
  revalidatePath(`${ROUTE}/${setId}`);
  return doc ? setWithCardsToDTO(doc) : null;
}

/**
 * Toggle the starred state of a card.
 * @param setId The set id.
 * @param cardId The card id.
 * @param starred The desired starred state.
 * @returns The updated set with cards.
 */
export async function toggleCardStarred(
  setId: string,
  cardId: string,
  starred: boolean,
): Promise<FlashCardSetWithCards | null> {
  const userId = await requireUserId();
  await connectToDatabase();
  const doc = await FlashCardSet.findOneAndUpdate(
    { _id: setId, userId, "cards._id": cardId },
    { $set: { "cards.$.starred": starred } },
    { new: true },
  );
  revalidatePath(`${ROUTE}/${setId}`);
  revalidatePath(`${ROUTE}/starred`);
  return doc ? setWithCardsToDTO(doc) : null;
}

/**
 * Delete a card from a flash card set.
 * @param setId The set id.
 * @param cardId The card id.
 * @returns The updated set with cards.
 */
export async function deleteCard(
  setId: string,
  cardId: string,
): Promise<FlashCardSetWithCards | null> {
  const userId = await requireUserId();
  await connectToDatabase();
  const doc = await FlashCardSet.findOneAndUpdate(
    { _id: setId, userId },
    { $pull: { cards: { _id: cardId } } },
    { new: true },
  );
  revalidatePath(`${ROUTE}/${setId}`);
  return doc ? setWithCardsToDTO(doc) : null;
}

/**
 * Get all starred cards grouped by set.
 * @returns Starred card groups, one entry per set that has starred cards.
 */
export async function getStarredCards(): Promise<StarredSetGroup[]> {
  const userId = await requireUserId();
  await connectToDatabase();
  const docs = await FlashCardSet.find({
    userId,
    "cards.starred": true,
  }).sort({ title: 1 });

  return docs.map((doc) => {
    const starred = (doc.cards as FlashCardDoc[])
      .filter((c) => c.starred)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    return {
      setId: doc._id.toString(),
      setTitle: doc.title,
      cards: starred.map(cardToDTO),
    };
  });
}
