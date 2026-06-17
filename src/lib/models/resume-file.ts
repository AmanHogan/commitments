import mongoose, { type Model, type InferSchemaType } from "mongoose";

const resumeFileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    label: { type: String, default: "" },
    originalName: { type: String, default: "" },
    contentType: { type: String, default: "application/pdf" },
    size: { type: Number, default: 0 },
    // The raw PDF bytes. Resume PDFs are well under the 16MB BSON limit, so we
    // store them inline rather than wiring up GridFS.
    data: { type: Buffer, required: true },
  },
  { timestamps: true },
);

export type ResumeFileDoc = InferSchemaType<typeof resumeFileSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const ResumeFile: Model<ResumeFileDoc> =
  (mongoose.models.ResumeFile as Model<ResumeFileDoc> | undefined) ??
  mongoose.model<ResumeFileDoc>("ResumeFile", resumeFileSchema);
