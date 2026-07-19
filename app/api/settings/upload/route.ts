import { NextResponse } from "next/server";
import { assertApiSession } from "@/lib/auth";
import { uploadToMinio } from "@/lib/minio";

const ALLOWED_FIELDS = ["logoWhite", "logoColored", "favicon"] as const;
const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/svg+xml",
  "image/x-icon",
  "image/vnd.microsoft.icon",
];
const MAX_FILE_SIZE = 2 * 1024 * 1024;

export async function POST(request: Request) {
  const unauthorized = await assertApiSession();
  if (unauthorized) return unauthorized;

  const formData = await request.formData();
  const field = String(formData.get("field") ?? "");
  const file = formData.get("file");

  if (!ALLOWED_FIELDS.includes(field as (typeof ALLOWED_FIELDS)[number])) {
    return NextResponse.json({ message: "Invalid upload field." }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ message: "Image file is required." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { message: "Unsupported file type. Please upload an image file." },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { message: "File is too large. Maximum size is 2 MB." },
      { status: 400 }
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadToMinio({
      folder: `settings/${field}`,
      fileName: file.name,
      contentType: file.type,
      buffer,
    });

    return NextResponse.json(uploaded, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Failed to upload image.",
      },
      { status: 500 }
    );
  }
}
