import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const AUTH_COOKIE_NAME = "sau_auth_session";

export type AuthenticatedUser = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "USER";
  status: "ACTIVE" | "INACTIVE";
};

export function createSessionToken() {
  return randomBytes(32).toString("hex");
}

export function buildSessionCookieOptions(rememberMe = false) {
  const maxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24;

  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export async function getSessionToken() {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_COOKIE_NAME)?.value ?? null;
}

export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const token = await getSessionToken();

  if (!token) {
    return null;
  }

  const user = await prisma.user.findFirst({
    where: {
      currentToken: token,
      status: "ACTIVE",
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
    },
  });

  return user;
}

export async function assertApiSession() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json(
      { message: "Unauthorized", code: "SESSION_ENDED" },
      { status: 401 }
    );
  }

  return null;
}
