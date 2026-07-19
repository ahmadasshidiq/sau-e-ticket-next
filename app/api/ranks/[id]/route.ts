import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { assertAdminApiSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/ranks/[id]">
) {
  const unauthorized = await assertAdminApiSession();
  if (unauthorized) return unauthorized;

  const { id } = await context.params;
  const body = await request.json();
  const name =
    body.name !== undefined ? String(body.name ?? "").trim() : undefined;

  if (name !== undefined && !name) {
    return NextResponse.json({ message: "Name is required." }, { status: 400 });
  }

  const existingRank = await prisma.rank.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existingRank) {
    return NextResponse.json({ message: "Rank not found." }, { status: 404 });
  }

  const updateData: Prisma.RankUpdateInput = {};
  if (name !== undefined) updateData.name = name;

  try {
    const rank = await prisma.rank.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(rank);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to update rank." },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/ranks/[id]">
) {
  const unauthorized = await assertAdminApiSession();
  if (unauthorized) return unauthorized;

  const { id } = await context.params;

  try {
    await prisma.rank.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to delete rank." },
      { status: 400 }
    );
  }
}
