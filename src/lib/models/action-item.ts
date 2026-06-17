import mongoose, { type Model, type InferSchemaType } from "mongoose";

const actionItemSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: null },
    criticality: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL", null],
      default: null,
    },
    dateStarted: { type: String, default: null },
    dateFinished: { type: String, default: null },
    dueDate: { type: String, default: null },
    dueTime: { type: String, default: null },
    completed: { type: Boolean, default: false },
    reminderSnoozedUntil: { type: String, default: null },
  },
  { timestamps: true },
);

export type ActionItemDoc = InferSchemaType<typeof actionItemSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const ActionItem: Model<ActionItemDoc> =
  (mongoose.models.ActionItem as Model<ActionItemDoc> | undefined) ??
  mongoose.model<ActionItemDoc>("ActionItem", actionItemSchema);
