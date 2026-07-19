import { NextResponse } from "next/server";
import { assertAdminApiSession, assertApiSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/crypto";
import { normalizeEnumValue } from "@/lib/enums";

const USER_ROLES = ["ADMIN", "USER"] as const;
const USER_STATUSES = ["ACTIVE", "INACTIVE"] as const;

export async function GET(request: Request) {
  const unauthorized = await assertApiSession();
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const pageSize = Math.max(1, Number(searchParams.get("pageSize") ?? "10"));
  const name = searchParams.get("name")?.trim() ?? "";
  const email = searchParams.get("email")?.trim() ?? "";
  const role = searchParams.get("role")?.trim() ?? "";
  const status = searchParams.get("status")?.trim() ?? "";

  const where = {
    ...(name
      ? {
          name: {
            contains: name,
            mode: "insensitive" as const,
          },
        }
      : {}),
    ...(email
      ? {
          email: {
            contains: email,
            mode: "insensitive" as const,
          },
        }
      : {}),
    ...(role
      ? {
          role: normalizeEnumValue(role, USER_ROLES, "USER"),
        }
      : {}),
    ...(status
      ? {
          status: normalizeEnumValue(status, USER_STATUSES, "ACTIVE"),
        }
      : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({
    data: users,
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
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!name || !email || !password) {
    return NextResponse.json(
      { message: "Name, email, and password are required." },
      { status: 400 }
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    return NextResponse.json(
      { message: "Email is already in use." },
      { status: 409 }
    );
  }

  const { salt, hashedPassword } = hashPassword(password);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      salt,
      role: normalizeEnumValue(body.role, USER_ROLES, "USER"),
      status: normalizeEnumValue(body.status, USER_STATUSES, "ACTIVE"),
    },
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

  return NextResponse.json(user, { status: 201 });
}
