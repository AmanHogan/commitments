import { getOneOnOnes } from "./actions";
import { OneOnOneClient } from "./one-on-one-client";

/**
 * One-on-One Documents page — lists and manages 1:1 meeting records.
 * @returns The rendered page.
 */
export default async function OneOnOnePage(): Promise<React.JSX.Element> {
  const docs = await getOneOnOnes();
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-2xl font-semibold">One-on-One Documents</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        1:1 meeting records sorted by date, newest first.
      </p>
      <OneOnOneClient initialDocs={docs} />
    </div>
  );
}
