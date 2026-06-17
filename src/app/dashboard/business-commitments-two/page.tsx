import { EventCommitmentClient } from "@/components/event-commitment-client";
import { getItems, createItem, updateItem, deleteItem, bulkCreateItems } from "./actions";

/**
 * TDP Program Impact page (Business Commitment Two).
 * @returns The rendered page.
 */
export default async function BusinessCommitmentsTwoPage(): Promise<React.JSX.Element> {
  const items = await getItems();
  return (
    <EventCommitmentClient
      title="TDP Program Impact"
      description="Track TDP program events and participation."
      descriptionDetail="Section 2 — AT&T & TDP Program Impact (4,000 char limit, 3-5 items). Highlight leadership, innovation, and TDP engagement OUTSIDE your BP work. At least 3 examples of how you distinguished yourself. Ownership levels matter — organizing > selected > participated > attended. Log sub-activities with dates and completion status. View full guide at /dashboard/docs."
      itemNoun="Event"
      initialItems={items}
      jsonType="bcomm2"
      actions={{ create: createItem, update: updateItem, remove: deleteItem, bulkCreate: bulkCreateItems }}
    />
  );
}
