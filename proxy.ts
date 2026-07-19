import { NextResponse, type NextRequest } from "next/server";

const AUTH_COOKIE_NAME = "sau_auth_session";
const PUBLIC_PATHS = ["/login"];

function isProtectedPath(pathname: string) {
  return (
    pathname === "/" ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/users") ||
    pathname.startsWith("/vessels") ||
    pathname.startsWith("/ranks") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/invoices") ||
    pathname.startsWith("/flight-tickets")
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const reason = request.nextUrl.searchParams.get("reason");
  const sessionToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const hasSession = Boolean(sessionToken);

  if (
    PUBLIC_PATHS.includes(pathname) &&
    hasSession &&
    reason !== "session-ended"
  ) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (isProtectedPath(pathname) && !hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|img/).*)"],
};
