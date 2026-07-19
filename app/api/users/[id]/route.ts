import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { assertApiSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/crypto";
import { normalizeEnumValue } from "@/lib/enums";

const USER_ROLES = ["ADMIN", "USER"] as const;
const USER_STATUSES = ["ACTIVE", "INACTIVE"] as const;

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/users/[id]">
) {
  const unauthorized = await assertApiSession();
  if (unauthorized) return unauthorized;

  const { id } = await context.params;
  const body = await request.json();
  const name =
    body.name !== undefined ? String(body.name ?? "").trim() : undefined;
  const email =
    body.email !== undefined
      ? String(body.email ?? "").trim().toLowerCase()
      : undefined;

  if (name !== undefined && !name) {
    return NextResponse.json(
      { message: "Name is required." },
      { status: 400 }
    );
  }

  if (email !== undefined && !email) {
    return NextResponse.json(
      { message: "Email is required." },
      { status: 400 }
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existingUser) {
    return NextResponse.json(
      { message: "User not found." },
      { status: 404 }
    );
  }

  if (email) {
    const emailOwner = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (emailOwner && emailOwner.id !== id) {
      return NextResponse.json(
        { message: "Email is already in use." },
        { status: 409 }
      );
    }
  }

  const updateData: Prisma.UserUpdateInput = {};

  if (name !== undefined) updateData.name = name;
  if (email !== undefined) updateData.email = email;
  if (body.currentToken !== undefined) updateData.currentToken = body.currentToken ?? null;
  if (body.role !== undefined) {
    updateData.role = normalizeEnumValue(body.role, USER_ROLES, "USER");
  }
  if (body.status !== undefined) {
    updateData.status = normalizeEnumValue(body.status, USER_STATUSES, "ACTIVE");
  }

  if (body.password !== undefined && String(body.password).trim() !== "") {
    const { salt, hashedPassword } = hashPassword(String(body.password));
    updateData.password = hashedPassword;
    updateData.salt = salt;
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Failed to update user.",
      },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/users/[id]">
) {
  const unauthorized = await assertApiSession();
  if (unauthorized) return unauthorized;

  const { id } = await context.params;

  try {
    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ message: "Failed to delete user." }, { status: 400 });
  }
}
