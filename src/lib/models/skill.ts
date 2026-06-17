import mongoose, { type Model, type InferSchemaType } from "mongoose";

const skillSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    proficiency: { type: Number, required: true, default: 3, min: 1, max: 5 },
    date: { type: String, default: null },
    tags: { type: [String], default: [] },
  },
  { timestamps: true },
);

export type SkillDoc = InferSchemaType<typeof skillSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Skill: Model<SkillDoc> =
  (mongoose.models.Skill as Model<SkillDoc> | undefined) ??
  mongoose.model<SkillDoc>("Skill", skillSchema);
