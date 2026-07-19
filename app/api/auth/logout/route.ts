import { NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  buildSessionCookieOptions,
  getSessionToken,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const token = await getSessionToken();

  if (token) {
    await prisma.user.updateMany({
      where: { currentToken: token },
      data: { currentToken: null },
    });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(AUTH_COOKIE_NAME, "", {
    ...buildSessionCookieOptions(false),
    maxAge: 0,
  });

  return response;
}
