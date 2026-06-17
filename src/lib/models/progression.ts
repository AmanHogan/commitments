import mongoose, { type Model, type InferSchemaType } from "mongoose";

/** Embedded STAR-formatted accomplishment (Business & Program sections). */
const starEntrySchema = new mongoose.Schema(
  {
    sourceType: {
      type: String,
      enum: ["bcomm1", "bcomm2", "dcomm2"],
      default: null,
    },
    sourceId: { type: String, default: null },
    title: { type: String, required: true, trim: true },
    situation: { type: String, default: "" },
    task: { type: String, default: "" },
    action: { type: String, default: "" },
    result: { type: String, default: "" },
  },
  { _id: true },
);

/** Embedded non-STAR development accomplishment (paragraph form). */
const developmentEntrySchema = new mongoose.Schema(
  {
    sourceId: { type: String, default: null },
    title: { type: String, required: true, trim: true },
    body: { type: String, default: "" },
    hours: { type: Number, default: null },
  },
  { _id: true },
);

const progressionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    businessEntries: { type: [starEntrySchema], default: [] },
    programEntries: { type: [starEntrySchema], default: [] },
    developmentEntries: { type: [developmentEntrySchema], default: [] },
  },
  { timestamps: true },
);

export type ProgressionDoc = InferSchemaType<typeof progressionSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Progression: Model<ProgressionDoc> =
  (mongoose.models.Progression as Model<ProgressionDoc> | undefined) ??
  mongoose.model<ProgressionDoc>("Progression", progressionSchema);
