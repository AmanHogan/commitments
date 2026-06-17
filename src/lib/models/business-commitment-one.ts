import mongoose, { type Model, type InferSchemaType } from "mongoose";

const valueEntrySchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    value: { type: String, required: true },
  },
  { _id: true },
);

const businessCommitmentOneSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    workItem: { type: String, required: true, trim: true },
    started: { type: String, default: null },
    dateCompleted: { type: String, default: null },
    applicationContext: { type: String, default: null },
    description: { type: String, default: null },
    problemOpportunity: { type: String, default: null },
    whoBenefited: { type: String, default: null },
    impact: { type: String, default: null },
    valueEntries: { type: [valueEntrySchema], default: [] },
    alignment: { type: String, default: null },
    statusNotes: { type: String, default: null },
    status: {
      type: String,
      enum: ["PENDING", "IN_PROGRESS", "COMPLETED", "FAILED"],
      default: "IN_PROGRESS",
    },
  },
  { timestamps: true },
);

export type BusinessCommitmentOneDoc = InferSchemaType<
  typeof businessCommitmentOneSchema
> & {
  _id: mongoose.Types.ObjectId;
};

export const BusinessCommitmentOne: Model<BusinessCommitmentOneDoc> =
  (mongoose.models.BusinessCommitmentOne as
    | Model<BusinessCommitmentOneDoc>
    | undefined) ??
  mongoose.model<BusinessCommitmentOneDoc>(
    "BusinessCommitmentOne",
    businessCommitmentOneSchema,
  );
