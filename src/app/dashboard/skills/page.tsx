import { getSkills } from "./actions";
import { SkillsClient } from "./skills-client";

/**
 * Skills page (server component). Loads the user's skills and renders the client UI.
 * @returns The rendered skills page.
 */
export default async function SkillsPage(): Promise<React.JSX.Element> {
  const skills = await getSkills();
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-2xl font-semibold">Skills</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Track your skills and proficiency (1–5).
      </p>
      <SkillsClient initialSkills={skills} />
    </div>
  );
}
