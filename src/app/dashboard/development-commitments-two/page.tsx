import { EventCommitmentClient } from "@/components/event-commitment-client";
import { getItems, createItem, updateItem, deleteItem } from "./actions";

/**
 * Innovation Commitment page (Development Commitment Two).
 * @returns The rendered page.
 */
export default async function DevelopmentCommitmentsTwoPage(): Promise<React.JSX.Element> {
  const items = await getItems();
  return (
    <EventCommitmentClient
      title="Innovation Commitment"
      description="Track innovation events and their sub-items."
      itemNoun="Event"
      initialItems={items}
      actions={{ create: createItem, update: updateItem, remove: deleteItem }}
    />
  );
}
