import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { ResumeFile } from "@/lib/models/resume-file";

/**
 * Stream a resume PDF's bytes for the authenticated owner, inline for viewing.
 * @param _request The incoming request (unused).
 * @param context The route context carrying the resume file id.
 * @returns The PDF response, or an error status.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  await connectToDatabase();
  const doc = await ResumeFile.findOne({ _id: id, userId });
  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const bytes = new Uint8Array(doc.data as unknown as Buffer);
  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": doc.contentType ?? "application/pdf",
      "Content-Disposition": `inline; filename="${(doc.label || "resume").replace(/"/g, "")}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
