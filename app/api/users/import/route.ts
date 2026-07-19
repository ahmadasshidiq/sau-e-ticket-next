import { NextResponse } from "next/server";
import { assertApiSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseCsv } from "@/lib/csv";
import { hashPassword } from "@/lib/crypto";
import { normalizeEnumValue } from "@/lib/enums";

const USER_ROLES = ["ADMIN", "USER"] as const;
const USER_STATUSES = ["ACTIVE", "INACTIVE"] as const;

export async function POST(request: Request) {
  const unauthorized = await assertApiSession();
  if (unauthorized) return unauthorized;

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ message: "CSV file is required." }, { status: 400 });
  }

  const text = await file.text();
  const rows = parseCsv(text);

  if (rows.length === 0) {
    return NextResponse.json(
      { message: "No valid user rows found in CSV file." },
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
        email: getValue("email"),
        password: getValue("password"),
        role: normalizeEnumValue(getValue("role"), USER_ROLES, "USER"),
        status: normalizeEnumValue(getValue("status"), USER_STATUSES, "ACTIVE"),
      };
    })
    .filter((row) => row.name && row.email);

  if (records.length === 0) {
    return NextResponse.json(
      { message: "No valid user rows found in CSV file." },
      { status: 400 }
    );
  }

  let imported = 0;
  let updated = 0;

  for (const record of records) {
    const existingUser = await prisma.user.findUnique({
      where: { email: record.email.toLowerCase() },
      select: { id: true },
    });

    if (existingUser) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name: record.name,
          role: record.role ?? "USER",
          status: record.status ?? "ACTIVE",
        },
      });
      updated += 1;
      continue;
    }

    const sourcePassword = record.password?.trim() || "ChangeMe123!";
    const { salt, hashedPassword } = hashPassword(sourcePassword);

    await prisma.user.create({
      data: {
        name: record.name,
        email: record.email.toLowerCase(),
        password: hashedPassword,
        salt,
        role: record.role ?? "USER",
        status: record.status ?? "ACTIVE",
      },
    });

    imported += 1;
  }

  return NextResponse.json({ imported, updated, total: records.length });
}
