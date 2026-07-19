import { NextResponse } from "next/server";
import { assertApiSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function normalizeOptionalString(value: unknown) {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized : null;
}

export async function GET() {
  const unauthorized = await assertApiSession();
  if (unauthorized) return unauthorized;

  const setting = await prisma.setting.findFirst({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      applicationName: true,
      companyName: true,
      logoWhite: true,
      logoColored: true,
      favicon: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!setting) {
    return NextResponse.json({
      id: "",
      applicationName: "SAU I-Ticket",
      companyName: "Sinergi Arah Utama",
      logoWhite: null,
      logoColored: null,
      favicon: null,
      createdAt: null,
      updatedAt: null,
    });
  }

  return NextResponse.json(setting);
}

export async function PATCH(request: Request) {
  const unauthorized = await assertApiSession();
  if (unauthorized) return unauthorized;

  const body = await request.json();
  const applicationName = String(body.applicationName ?? "").trim();

  if (!applicationName) {
    return NextResponse.json(
      { message: "Application name is required." },
      { status: 400 }
    );
  }

  const payload = {
    applicationName,
    companyName: normalizeOptionalString(body.companyName),
    logoWhite: normalizeOptionalString(body.logoWhite),
    logoColored: normalizeOptionalString(body.logoColored),
    favicon: normalizeOptionalString(body.favicon),
  };

  const existingSetting = await prisma.setting.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  const setting = existingSetting
    ? await prisma.setting.update({
        where: { id: existingSetting.id },
        data: payload,
        select: {
          id: true,
          applicationName: true,
          companyName: true,
          logoWhite: true,
          logoColored: true,
          favicon: true,
          createdAt: true,
          updatedAt: true,
        },
      })
    : await prisma.setting.create({
        data: payload,
        select: {
          id: true,
          applicationName: true,
          companyName: true,
          logoWhite: true,
          logoColored: true,
          favicon: true,
          createdAt: true,
          updatedAt: true,
        },
      });

  return NextResponse.json(setting);
}
