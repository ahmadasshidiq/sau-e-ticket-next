import { NextResponse } from "next/server";
import { assertAdminApiSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseCsv } from "@/lib/csv";
import { normalizeEnumValue } from "@/lib/enums";

const VESSEL_TYPES = ["CREWING_TANKER", "CMOS", "TAD"] as const;

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
      { message: "No valid vessel rows found in CSV file." },
      { status: 400 }
    );
  }

  const [headerRow, ...dataRows] = rows;
  const headers = headerRow.map((header) => header.toLowerCase());
  const records = dataRows
    .filter((row) => row.some((cell) => cell.trim() !== ""))
    .map((row) => {
      const getValue = (name: string) => {
        const index = headers.indexOf(name);
        return index >= 0 ? row[index]?.trim() ?? "" : "";
      };

      return {
        name: getValue("name"),
        type: normalizeEnumValue(getValue("type"), VESSEL_TYPES, "CREWING_TANKER"),
      };
    })
    .filter((row) => row.name);

  if (records.length === 0) {
    return NextResponse.json(
      { message: "No valid vessel rows found in CSV file." },
      { status: 400 }
    );
  }

  let imported = 0;
  let updated = 0;

  for (const record of records) {
    const existingVessel = await prisma.vessel.findUnique({
      where: { name: record.name },
      select: { id: true },
    });

    if (existingVessel) {
      await prisma.vessel.update({
        where: { id: existingVessel.id },
        data: { type: record.type },
      });
      updated += 1;
      continue;
    }

    await prisma.vessel.create({
      data: {
        name: record.name,
        type: record.type,
      },
    });
    imported += 1;
  }

  return NextResponse.json({ imported, updated, total: records.length });
}
