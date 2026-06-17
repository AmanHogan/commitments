import mongoose, { type Model, type InferSchemaType } from "mongoose";

const learningModuleSchema = new mongoose.Schema(
  {
    moduleName: { type: String, required: true },
    type: { type: String, default: null },
    hours: { type: Number, default: null },
    dateStarted: { type: String, default: null },
    dateFinished: { type: String, default: null },
    finished: { type: Boolean, default: false },
    required: { type: Boolean, default: false },
    description: { type: String, default: null },
  },
  { _id: true },
);

const developmentCommitmentOneSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    itemName: { type: String, required: true, trim: true },
    description: { type: String, default: null },
    itemDate: { type: String, default: null },
    dateCompleted: { type: String, default: null },
    modules: { type: [learningModuleSchema], default: [] },
  },
  { timestamps: true },
);

export type DevelopmentCommitmentOneDoc = InferSchemaType<
  typeof developmentCommitmentOneSchema
> & {
  _id: mongoose.Types.ObjectId;
};

export const DevelopmentCommitmentOne: Model<DevelopmentCommitmentOneDoc> =
  (mongoose.models.DevelopmentCommitmentOne as
    | Model<DevelopmentCommitmentOneDoc>
    | undefined) ??
  mongoose.model<DevelopmentCommitmentOneDoc>(
    "DevelopmentCommitmentOne",
    developmentCommitmentOneSchema,
  );
