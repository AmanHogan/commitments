import { getDevelopmentCommitments } from "./actions";
import { DevelopmentCommitmentsClient } from "./development-commitments-client";

/**
 * Development Commitment page (Development Commitment One).
 * @returns The rendered page.
 */
export default async function DevelopmentCommitmentsOnePage(): Promise<React.JSX.Element> {
  const items = await getDevelopmentCommitments();
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-2xl font-semibold">Development Commitment</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Track learning items and their modules.
      </p>
      <DevelopmentCommitmentsClient initialItems={items} />
    </div>
  );
}
