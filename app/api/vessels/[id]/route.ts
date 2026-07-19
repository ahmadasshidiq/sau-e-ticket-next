import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { assertAdminApiSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeEnumValue } from "@/lib/enums";

const VESSEL_TYPES = ["CREWING_TANKER", "CMOS", "TAD"] as const;

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/vessels/[id]">
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

  const existingVessel = await prisma.vessel.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existingVessel) {
    return NextResponse.json({ message: "Vessel not found." }, { status: 404 });
  }

  const updateData: Prisma.VesselUpdateInput = {};
  if (name !== undefined) updateData.name = name;
  if (body.type !== undefined) {
    updateData.type = normalizeEnumValue(body.type, VESSEL_TYPES, "CREWING_TANKER");
  }

  try {
    const vessel = await prisma.vessel.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        type: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(vessel);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to update vessel." },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/vessels/[id]">
) {
  const unauthorized = await assertAdminApiSession();
  if (unauthorized) return unauthorized;

  const { id } = await context.params;

  try {
    await prisma.vessel.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to delete vessel." },
      { status: 400 }
    );
  }
}
