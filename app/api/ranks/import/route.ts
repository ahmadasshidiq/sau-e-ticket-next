import { NextResponse } from "next/server";
import { assertAdminApiSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseCsv } from "@/lib/csv";

export async function POST(request: Request) {
  const unauthorized = await assertAdminApiSession();
  if (unauthorized) return unauthorized;

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ message: "CSV file is required." }, { status: 400 });
  }

  const rows = parseCsv(await file.text());
  if (rows.length === 0) {
    return NextResponse.json(
      { message: "No valid rank rows found in CSV file." },
      { status: 400 }
    );
  }

  const [headerRow, ...dataRows] = rows;
  const headers = headerRow.map((header) => header.toLowerCase());
  const records = dataRows
    .filter((row) => row.some((cell) => cell.trim() !== ""))
    .map((row) => {
      const index = headers.indexOf("name");
      return {
        name: index >= 0 ? row[index]?.trim() ?? "" : "",
      };
    })
    .filter((row) => row.name);

  if (records.length === 0) {
    return NextResponse.json(
      { message: "No valid rank rows found in CSV file." },
      { status: 400 }
    );
  }

  let imported = 0;
  let updated = 0;

  for (const record of records) {
    const existingRank = await prisma.rank.findUnique({
      where: { name: record.name },
      select: { id: true },
    });

    if (existingRank) {
      await prisma.rank.update({
        where: { id: existingRank.id },
        data: { name: record.name },
      });
      updated += 1;
      continue;
    }

    await prisma.rank.create({
      data: { name: record.name },
    });
    imported += 1;
  }

  return NextResponse.json({ imported, updated, total: records.length });
}
