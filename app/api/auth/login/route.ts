import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  AUTH_COOKIE_NAME,
  buildSessionCookieOptions,
  createSessionToken,
} from "@/lib/auth";
import { verifyPassword } from "@/lib/crypto";

export async function POST(request: Request) {
  const body = await request.json();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const rememberMe = Boolean(body.rememberMe);

  if (!email || !password) {
    return NextResponse.json(
      { message: "Email and password are required." },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      password: true,
      salt: true,
      role: true,
      status: true,
    },
  });

  if (!user || user.status !== "ACTIVE") {
    return NextResponse.json(
      { message: "Invalid email or password." },
      { status: 401 }
    );
  }

  const passwordValid = verifyPassword(password, user.salt, user.password);

  if (!passwordValid) {
    return NextResponse.json(
      { message: "Invalid email or password." },
      { status: 401 }
    );
  }

  const sessionToken = createSessionToken();

  await prisma.user.update({
    where: { id: user.id },
    data: { currentToken: sessionToken },
  });

  const response = NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });

  response.cookies.set(
    AUTH_COOKIE_NAME,
    sessionToken,
    buildSessionCookieOptions(rememberMe)
  );

  return response;
}
