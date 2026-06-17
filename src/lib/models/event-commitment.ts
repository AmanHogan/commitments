import mongoose, { type Model, type InferSchemaType } from "mongoose";

// Shared schema for event commitments (an event with embedded sub-items), used
// by both Development Commitment Two and Business Commitment Two — they have an
// identical structure. The single schema instance is compiled into two models.

const subItemSchema = new mongoose.Schema(
  {
    subEventName: { type: String, required: true },
    description: { type: String, default: null },
    started: { type: String, default: null },
    finished: { type: String, default: null },
    done: { type: Boolean, default: false },
  },
  { _id: true },
);

const eventCommitmentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    eventName: { type: String, required: true, trim: true },
    type: { type: String, default: null },
    applicationContext: { type: String, default: null },
    description: { type: String, default: null },
    impact: { type: String, default: null },
    started: { type: String, default: null },
    finished: { type: String, default: null },
    done: { type: Boolean, default: false },
    required: { type: Boolean, default: false },
    subItems: { type: [subItemSchema], default: [] },
  },
  { timestamps: true },
);

export type EventCommitmentDoc = InferSchemaType<typeof eventCommitmentSchema> & {
  _id: mongoose.Types.ObjectId;
};

/**
 * Get (or create) an event-commitment model registered under `name`.
 * @param name The Mongoose model name / collection.
 * @returns The model, reusing any already-registered instance (HMR-safe).
 */
export function getEventCommitmentModel(
  name: string,
): Model<EventCommitmentDoc> {
  return (
    (mongoose.models[name] as Model<EventCommitmentDoc> | undefined) ??
    mongoose.model<EventCommitmentDoc>(name, eventCommitmentSchema)
  );
}
