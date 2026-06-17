import { getProgressions } from "./actions";
import { getBusinessCommitments } from "@/app/dashboard/business-commitments/actions";
import { getItems as getTdpItems } from "@/app/dashboard/business-commitments-two/actions";
import { getItems as getInnovationItems } from "@/app/dashboard/development-commitments-two/actions";
import { getDevelopmentCommitments } from "@/app/dashboard/development-commitments-one/actions";
import { ProgressionsClient } from "./progressions-client";

/**
 * Progressions page — curate your best work into a STAR-formatted submission.
 * Loads existing progressions plus the source commitment pools for importing.
 * @returns The rendered page.
 */
export default async function ProgressionsPage(): Promise<React.JSX.Element> {
  const [progressions, businessPool, tdpPool, innovationPool, developmentPool] =
    await Promise.all([
      getProgressions(),
      getBusinessCommitments(),
      getTdpItems(),
      getInnovationItems(),
      getDevelopmentCommitments(),
    ]);

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-1 text-2xl font-semibold">Progressions</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Curate your strongest work into a STAR-formatted progression submission.
        Import from your commitments on the left, refine the 3-5 you choose on the right.
      </p>
      <ProgressionsClient
        initialProgressions={progressions}
        businessPool={businessPool}
        tdpPool={tdpPool}
        innovationPool={innovationPool}
        developmentPool={developmentPool}
      />
    </div>
  );
}
