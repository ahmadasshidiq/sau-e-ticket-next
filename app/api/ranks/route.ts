import { NextResponse } from "next/server";
import { assertApiSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const unauthorized = await assertApiSession();
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const pageSize = Math.max(1, Number(searchParams.get("pageSize") ?? "10"));
  const name = searchParams.get("name")?.trim() ?? "";

  const where = {
    ...(name
      ? {
          name: {
            contains: name,
            mode: "insensitive" as const,
          },
        }
      : {}),
  };

  const [ranks, total] = await Promise.all([
    prisma.rank.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.rank.count({ where }),
  ]);

  return NextResponse.json({
    data: ranks,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  });
}

export async function POST(request: Request) {
  const unauthorized = await assertApiSession();
  if (unauthorized) return unauthorized;

  const body = await request.json();
  const name = String(body.name ?? "").trim();

  if (!name) {
    return NextResponse.json({ message: "Name is required." }, { status: 400 });
  }

  try {
    const rank = await prisma.rank.create({
      data: { name },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(rank, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to create rank." },
      { status: 400 }
    );
  }
}
