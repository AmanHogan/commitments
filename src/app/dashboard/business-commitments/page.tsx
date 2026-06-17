import { getBusinessCommitments } from "./actions";
import { BusinessCommitmentsClient } from "./business-commitments-client";

/**
 * Business Partner Impact page (Business Commitment One).
 * @returns The rendered page.
 */
export default async function BusinessCommitmentsPage(): Promise<React.JSX.Element> {
  const commitments = await getBusinessCommitments();
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-2xl font-semibold">Business Partner Impact</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Deliver measurable business impact through your Business Partner assignment.
      </p>
      <BusinessCommitmentsClient initialCommitments={commitments} />
    </div>
  );
}
