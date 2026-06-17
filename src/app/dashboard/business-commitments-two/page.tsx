import { EventCommitmentClient } from "@/components/event-commitment-client";
import { getItems, createItem, updateItem, deleteItem } from "./actions";

/**
 * TDP Program Impact page (Business Commitment Two).
 * @returns The rendered page.
 */
export default async function BusinessCommitmentsTwoPage(): Promise<React.JSX.Element> {
  const items = await getItems();
  return (
    <EventCommitmentClient
      title="TDP Program Impact"
      description="Track program impact events and their sub-items."
      itemNoun="Event"
      initialItems={items}
      actions={{ create: createItem, update: updateItem, remove: deleteItem }}
    />
  );
}
