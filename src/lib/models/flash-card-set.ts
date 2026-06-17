import mongoose, { type InferSchemaType } from "mongoose";

const flashCardSchema = new mongoose.Schema(
  {
    term: { type: String, required: true },
    definition: { type: String, required: true },
    sortOrder: { type: Number, default: 0 },
    groupName: { type: String, default: null },
    termImageUrl: { type: String, default: null },
    definitionImageUrl: { type: String, default: null },
    hint: { type: String, default: null },
    starred: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const flashCardSetSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, default: null },
    topic: { type: String, default: null },
    tags: { type: [String], default: [] },
    timesStudied: { type: Number, default: 0 },
    cards: { type: [flashCardSchema], default: [] },
  },
  { timestamps: true },
);

export type FlashCardDoc = InferSchemaType<typeof flashCardSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type FlashCardSetDoc = InferSchemaType<typeof flashCardSetSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const FlashCardSet =
  (mongoose.models.FlashCardSet as mongoose.Model<FlashCardSetDoc>) ??
  mongoose.model<FlashCardSetDoc>("FlashCardSet", flashCardSetSchema);
