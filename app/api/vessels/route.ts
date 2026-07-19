import { NextResponse } from "next/server";
import { assertAdminApiSession, assertApiSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeEnumValue } from "@/lib/enums";

const VESSEL_TYPES = ["CREWING_TANKER", "CMOS", "TAD"] as const;

export async function GET(request: Request) {
  const unauthorized = await assertApiSession();
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const pageSize = Math.max(1, Number(searchParams.get("pageSize") ?? "10"));
  const name = searchParams.get("name")?.trim() ?? "";
  const type = searchParams.get("type")?.trim() ?? "";

  const where = {
    ...(name
      ? {
          name: {
            contains: name,
            mode: "insensitive" as const,
          },
        }
      : {}),
    ...(type
      ? {
          type: normalizeEnumValue(type, VESSEL_TYPES, "CREWING_TANKER"),
        }
      : {}),
  };

  const [vessels, total] = await Promise.all([
    prisma.vessel.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        type: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.vessel.count({ where }),
  ]);

  return NextResponse.json({
    data: vessels,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  });
}

export async function POST(request: Request) {
  const unauthorized = await assertAdminApiSession();
  if (unauthorized) return unauthorized;

  const body = await request.json();
  const name = String(body.name ?? "").trim();

  if (!name) {
    return NextResponse.json({ message: "Name is required." }, { status: 400 });
  }

  try {
    const vessel = await prisma.vessel.create({
      data: {
        name,
        type: normalizeEnumValue(body.type, VESSEL_TYPES, "CREWING_TANKER"),
      },
      select: {
        id: true,
        name: true,
        type: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(vessel, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to create vessel." },
      { status: 400 }
    );
  }
}
