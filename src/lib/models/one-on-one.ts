import mongoose, { type InferSchemaType } from "mongoose";

const oneOnOneSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    documentDate: { type: String, required: true },
    businessPartnerWork: { type: String, default: null },
    workloadConcerns: { type: String, default: null },
    tdpContributions: { type: String, default: null },
    utilizationPercentage: { type: Number, default: null },
    trainingSkills: { type: String, default: null },
    pursuingDegrees: { type: String, default: null },
    compliancePercentage: { type: Number, default: null },
    ehsTrainingPercentage: { type: Number, default: null },
    growthHubProgress: { type: String, default: null },
    successPathwaysUpdated: { type: Boolean, default: false },
    contingencyTrainingPercentage: { type: Number, default: null },
    innovationEvents: { type: String, default: null },
    accomplishments: { type: String, default: null },
    challenges: { type: String, default: null },
    goals: { type: String, default: null },
    questions: { type: String, default: null },
    receivingSupport: { type: String, default: null },
    additionalItems: { type: String, default: null },
    outOfOfficePlans: { type: String, default: null },
  },
  { timestamps: true },
);

export type OneOnOneDoc = InferSchemaType<typeof oneOnOneSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const OneOnOne =
  (mongoose.models.OneOnOne as mongoose.Model<OneOnOneDoc>) ??
  mongoose.model<OneOnOneDoc>("OneOnOne", oneOnOneSchema);
