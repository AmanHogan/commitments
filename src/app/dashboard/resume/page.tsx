import { getResumeFiles } from "./actions";
import { ResumeClient } from "./resume-client";

/**
 * Resume page — upload, label, view, and manage resume PDF versions.
 * @returns The rendered page.
 */
export default async function ResumePage(): Promise<React.JSX.Element> {
  const files = await getResumeFiles();
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-1 text-2xl font-semibold">Resume</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Upload and view your resume versions. PDFs only, up to 8 MB.
      </p>
      <ResumeClient initialFiles={files} />
    </div>
  );
}
