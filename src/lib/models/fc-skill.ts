import mongoose, { type InferSchemaType } from "mongoose";

const fcSkillSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true },
    proficiency: { type: Number, default: 3 },
    date: { type: String, default: null },
    flashCardSetId: { type: mongoose.Schema.Types.ObjectId, ref: "FlashCardSet", default: null },
  },
  { timestamps: true },
);

export type FcSkillDoc = InferSchemaType<typeof fcSkillSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const FcSkill =
  (mongoose.models.FcSkill as mongoose.Model<FcSkillDoc>) ??
  mongoose.model<FcSkillDoc>("FcSkill", fcSkillSchema);
