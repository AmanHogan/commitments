import { getActionItems } from "./actions";
import { ActionItemsClient } from "./action-items-client";

/**
 * Action Items page.
 * @returns The rendered page.
 */
export default async function ActionItemsPage(): Promise<React.JSX.Element> {
  const items = await getActionItems();
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-2xl font-semibold">Action Items</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Tasks with criticality and due dates.
      </p>
      <ActionItemsClient initialItems={items} />
    </div>
  );
}
