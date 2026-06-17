import { getFcSkills, getSetOptions } from "./actions";
import { FcSkillsClient } from "./fc-skills-client";

/**
 * Flashcard Skills page — manage skills linked to flash card sets.
 * @returns The rendered page.
 */
export default async function FcSkillsPage(): Promise<React.JSX.Element> {
  const [skills, setOptions] = await Promise.all([getFcSkills(), getSetOptions()]);
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-2xl font-semibold">Flashcard Skills</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Skills tracked alongside your flashcard sets.
      </p>
      <FcSkillsClient initialSkills={skills} setOptions={setOptions} />
    </div>
  );
}
