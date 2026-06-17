import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { ResumeFile } from "@/lib/models/resume-file";

/** Maximum accepted resume upload size (8 MB) — well within the BSON limit. */
const MAX_BYTES = 8 * 1024 * 1024;

/**
 * Upload a resume PDF for the authenticated user. Accepts multipart form data
 * with `file` (the PDF) and optional `label`. Stores the bytes inline in Mongo.
 * @param request The incoming multipart request.
 * @returns JSON metadata of the created resume file, or an error response.
 */
export async function POST(request: Request): Promise<NextResponse> {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF files are allowed." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File exceeds the 8 MB limit." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const rawLabel = form.get("label");
  const label =
    typeof rawLabel === "string" && rawLabel.trim().length > 0
      ? rawLabel.trim()
      : file.name.replace(/\.[^/.]+$/, "");

  await connectToDatabase();
  const doc = await ResumeFile.create({
    userId,
    label,
    originalName: file.name,
    contentType: file.type,
    size: buffer.length,
    data: buffer,
  });

  return NextResponse.json({
    id: doc._id.toString(),
    label: doc.label ?? "",
    originalName: doc.originalName ?? "",
    contentType: doc.contentType ?? "application/pdf",
    size: doc.size ?? 0,
    createdAt: (doc.createdAt as Date).toISOString(),
    updatedAt: (doc.updatedAt as Date).toISOString(),
  });
}
