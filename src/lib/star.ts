import type {
  BusinessCommitmentOne,
  EventCommitment,
  StarEntry,
} from "./types";

/**
 * Generate a stable-enough local id for a new STAR entry.
 * Uses crypto.randomUUID when available, falling back to a timestamp.
 * @returns A unique string id.
 */
export function newStarId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `star_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

/**
 * Join several optional text fragments into a single block, skipping blanks.
 * @param parts The fragments to join.
 * @param sep The separator (defaults to two newlines).
 * @returns The joined non-empty fragments.
 */
function joinParts(parts: Array<string | null | undefined>, sep = "\n\n"): string {
  return parts
    .map((p) => (p ?? "").trim())
    .filter((p) => p.length > 0)
    .join(sep);
}

/**
 * Pre-fill a STAR entry draft from a Business Partner Impact commitment.
 * The mapping is a best-guess starting point the user is expected to edit:
 * Situation <- problem + who benefited, Task <- application context,
 * Action <- description, Result <- impact + value entries + alignment.
 * @param c The business commitment to convert.
 * @returns A STAR entry draft linked to the source commitment.
 */
export function businessToStar(c: BusinessCommitmentOne): StarEntry {
  const result = joinParts([
    c.impact,
    c.valueEntries.length > 0
      ? c.valueEntries.map((v) => `${v.label}: ${v.value}`).join("\n")
      : null,
    c.alignment ? `Alignment: ${c.alignment}` : null,
  ]);
  return {
    id: c.id,
    sourceType: "bcomm1",
    sourceId: c.id,
    title: c.workItem,
    situation: joinParts([
      c.problemOpportunity,
      c.whoBenefited ? `Who benefited: ${c.whoBenefited}` : null,
    ]),
    task: c.applicationContext ?? "",
    action: c.description ?? "",
    result,
  };
}

/**
 * Pre-fill a STAR entry draft from a TDP Program or Innovation event commitment.
 * Events have less structure than business commitments, so most content lands in
 * Situation/Action with sub-events summarized into Result for the user to refine.
 * @param e The event commitment to convert.
 * @param sourceType Which collection it came from ("bcomm2" or "dcomm2").
 * @returns A STAR entry draft linked to the source event.
 */
export function eventToStar(
  e: EventCommitment,
  sourceType: "bcomm2" | "dcomm2",
): StarEntry {
  const result =
    e.subItems.length > 0
      ? `Delivered: ${e.subItems
          .map((s) => s.subEventName)
          .filter((n) => n.trim().length > 0)
          .join(", ")}`
      : "";
  return {
    id: e.id,
    sourceType,
    sourceId: e.id,
    title: e.eventName,
    situation: e.description ?? "",
    task: e.type ? `Role / type: ${e.type}` : "",
    action: e.description ?? "",
    result,
  };
}

/**
 * Render a STAR entry as a flowing paragraph (the submission-ready form).
 * Drops the S/T/A/R labels and joins the non-empty parts into prose.
 * @param entry The STAR entry to render.
 * @returns The combined paragraph text.
 */
export function starToParagraph(entry: StarEntry): string {
  return joinParts([entry.situation, entry.task, entry.action, entry.result], " ");
}

/**
 * Count the characters a STAR entry contributes toward a section's 4,000 limit.
 * @param entry The STAR entry.
 * @returns The character count of the rendered paragraph.
 */
export function starCharCount(entry: StarEntry): number {
  return starToParagraph(entry).length;
}
