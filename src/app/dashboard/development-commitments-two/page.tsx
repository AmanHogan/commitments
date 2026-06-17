import { EventCommitmentClient } from "@/components/event-commitment-client";
import { getItems, createItem, updateItem, deleteItem, bulkCreateItems } from "./actions";

/**
 * Innovation Commitment page (Development Commitment Two).
 * @returns The rendered page.
 */
export default async function DevelopmentCommitmentsTwoPage(): Promise<React.JSX.Element> {
  const items = await getItems();
  return (
    <EventCommitmentClient
      title="Innovation Commitment"
      description="Track innovation events and their sub-activities."
      descriptionDetail="Innovation Commitment — Document hackathons, competitions, and creative initiatives that build your AT&T brand. Each entry needs your specific role (led/organized/participated), dates, and the outcome or recognition. Sub-events (demos, presentations, patent submissions) can be tracked as sub-items with their own dates and completion status."
      itemNoun="Event"
      initialItems={items}
      jsonType="dcomm2"
      actions={{ create: createItem, update: updateItem, remove: deleteItem, bulkCreate: bulkCreateItems }}
    />
  );
}
