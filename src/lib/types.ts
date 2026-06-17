// ── One-on-One Documents ──────────────────────────────────────────────────────

export interface OneOnOne {
  id: string;
  documentDate: string;
  businessPartnerWork: string | null;
  workloadConcerns: string | null;
  tdpContributions: string | null;
  utilizationPercentage: number | null;
  trainingSkills: string | null;
  pursuingDegrees: string | null;
  compliancePercentage: number | null;
  ehsTrainingPercentage: number | null;
  growthHubProgress: string | null;
  successPathwaysUpdated: boolean;
  contingencyTrainingPercentage: number | null;
  innovationEvents: string | null;
  accomplishments: string | null;
  challenges: string | null;
  goals: string | null;
  questions: string | null;
  receivingSupport: string | null;
  additionalItems: string | null;
  outOfOfficePlans: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOneOnOneInput {
  documentDate: string;
  businessPartnerWork?: string | null;
  workloadConcerns?: string | null;
  tdpContributions?: string | null;
  utilizationPercentage?: number | null;
  trainingSkills?: string | null;
  pursuingDegrees?: string | null;
  compliancePercentage?: number | null;
  ehsTrainingPercentage?: number | null;
  growthHubProgress?: string | null;
  successPathwaysUpdated?: boolean;
  contingencyTrainingPercentage?: number | null;
  innovationEvents?: string | null;
  accomplishments?: string | null;
  challenges?: string | null;
  goals?: string | null;
  questions?: string | null;
  receivingSupport?: string | null;
  additionalItems?: string | null;
  outOfOfficePlans?: string | null;
}

// ── Progressions (STAR-formatted curated submissions) ─────────────────────────

/** The source collection a STAR entry was imported from. */
export type StarSourceType = "bcomm1" | "bcomm2" | "dcomm2";

/**
 * A single STAR-formatted accomplishment used in a progression section.
 * Optionally linked back to the commitment it was imported from.
 */
export interface StarEntry {
  /** Local identifier within the progression (uuid or source id). */
  id: string;
  /** Which collection it came from, or null if hand-written. */
  sourceType: StarSourceType | null;
  /** The source commitment id, or null if hand-written. */
  sourceId: string | null;
  title: string;
  situation: string;
  task: string;
  action: string;
  result: string;
}

/** A non-STAR development accomplishment (paragraph form). */
export interface DevelopmentEntry {
  id: string;
  sourceId: string | null;
  title: string;
  body: string;
  hours: number | null;
}

export interface Progression {
  id: string;
  title: string;
  businessEntries: StarEntry[];
  programEntries: StarEntry[];
  developmentEntries: DevelopmentEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface SaveProgressionInput {
  title: string;
  businessEntries: Omit<StarEntry, "id">[];
  programEntries: Omit<StarEntry, "id">[];
  developmentEntries: Omit<DevelopmentEntry, "id">[];
}

// ── Resume files ──────────────────────────────────────────────────────────────

/** Metadata for an uploaded resume PDF (never includes the file bytes). */
export interface ResumeFileMeta {
  id: string;
  label: string;
  originalName: string;
  contentType: string;
  size: number;
  createdAt: string;
  updatedAt: string;
}

// Client-facing DTOs. Server Actions convert Mongoose documents into these
// plain, serializable shapes (ObjectId -> string id) before returning them.

export interface Skill {
  id: string;
  name: string;
  proficiency: number;
  date: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateSkillInput {
  name: string;
  proficiency: number;
  date?: string | null;
  tags?: string[];
}

export type UpdateSkillInput = Partial<CreateSkillInput>;

// ── Business Commitment One ──────────────────────────────────────────────────

export type CommitmentStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "FAILED";

export const COMMITMENT_STATUSES: CommitmentStatus[] = [
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "FAILED",
];

export const VALUE_CATEGORIES: string[] = [
  "Improved outcomes",
  "Increased efficiency",
  "Reduced risk/cost",
  "Enhanced customer experience",
  "Enhanced employee experience",
];

export interface ValueEntry {
  label: string;
  value: string;
}

export interface BusinessCommitmentOne {
  id: string;
  workItem: string;
  started: string | null;
  dateCompleted: string | null;
  applicationContext: string | null;
  description: string | null;
  problemOpportunity: string | null;
  whoBenefited: string | null;
  impact: string | null;
  valueEntries: ValueEntry[];
  alignment: string | null;
  statusNotes: string | null;
  status: CommitmentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBusinessCommitmentOneInput {
  workItem: string;
  started?: string | null;
  dateCompleted?: string | null;
  applicationContext?: string | null;
  description?: string | null;
  problemOpportunity?: string | null;
  whoBenefited?: string | null;
  impact?: string | null;
  valueEntries?: ValueEntry[];
  alignment?: string | null;
  statusNotes?: string | null;
  status?: CommitmentStatus;
}

// ── Development Commitment One (learning modules) ─────────────────────────────

export interface LearningModule {
  id: string;
  moduleName: string;
  type: string | null;
  hours: number | null;
  dateStarted: string | null;
  dateFinished: string | null;
  finished: boolean;
  required: boolean;
  description: string | null;
}

export interface LearningModuleInput {
  moduleName: string;
  type?: string | null;
  hours?: number | null;
  dateStarted?: string | null;
  dateFinished?: string | null;
  finished?: boolean;
  required?: boolean;
  description?: string | null;
}

export interface DevelopmentCommitmentOne {
  id: string;
  itemName: string;
  description: string | null;
  itemDate: string | null;
  dateCompleted: string | null;
  modules: LearningModule[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateDevelopmentCommitmentOneInput {
  itemName: string;
  description?: string | null;
  itemDate?: string | null;
  dateCompleted?: string | null;
  modules?: LearningModuleInput[];
}

// ── Event commitments (Development Two / Business Two) ────────────────────────

export interface EventSubItem {
  id: string;
  subEventName: string;
  description: string | null;
  started: string | null;
  finished: string | null;
  done: boolean;
}

export interface EventSubItemInput {
  subEventName: string;
  description?: string | null;
  started?: string | null;
  finished?: string | null;
  done?: boolean;
}

export interface EventCommitment {
  id: string;
  eventName: string;
  type: string | null;
  description: string | null;
  started: string | null;
  finished: string | null;
  done: boolean;
  required: boolean;
  subItems: EventSubItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventCommitmentInput {
  eventName: string;
  type?: string | null;
  description?: string | null;
  started?: string | null;
  finished?: string | null;
  done?: boolean;
  required?: boolean;
  subItems?: EventSubItemInput[];
}

// ── Action Items ─────────────────────────────────────────────────────────────

export type Criticality = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export const CRITICALITY_OPTIONS: Criticality[] = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
];

export interface ActionItem {
  id: string;
  name: string;
  description: string | null;
  criticality: Criticality | null;
  dateStarted: string | null;
  dateFinished: string | null;
  dueDate: string | null;
  dueTime: string | null;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Flashcards ────────────────────────────────────────────────────────────────

export interface FlashCard {
  id: string;
  term: string;
  definition: string;
  sortOrder: number;
  groupName: string | null;
  termImageUrl: string | null;
  definitionImageUrl: string | null;
  hint: string | null;
  starred: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFlashCardInput {
  term: string;
  definition: string;
  sortOrder?: number;
  groupName?: string | null;
  termImageUrl?: string | null;
  definitionImageUrl?: string | null;
  hint?: string | null;
  starred?: boolean;
}

export interface FlashCardSet {
  id: string;
  title: string;
  description: string | null;
  topic: string | null;
  tags: string[];
  timesStudied: number;
  cardCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface FlashCardSetWithCards extends FlashCardSet {
  cards: FlashCard[];
}

export interface CreateFlashCardSetInput {
  title: string;
  description?: string | null;
  topic?: string | null;
  tags?: string[];
}

export interface StarredSetGroup {
  setId: string;
  setTitle: string;
  cards: FlashCard[];
}

// ── FC Skills ─────────────────────────────────────────────────────────────────

export interface FcSkill {
  id: string;
  name: string;
  proficiency: number;
  date: string | null;
  flashCardSetId: string | null;
  flashCardSetTitle: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFcSkillInput {
  name: string;
  proficiency?: number;
  date?: string | null;
  flashCardSetId?: string | null;
}

export interface CreateActionItemInput {
  name: string;
  description?: string | null;
  criticality?: Criticality | null;
  dateStarted?: string | null;
  dateFinished?: string | null;
  dueDate?: string | null;
  dueTime?: string | null;
  completed?: boolean;
}
