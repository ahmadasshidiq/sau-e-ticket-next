"use client";

import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import type { AuthenticatedUser } from "@/lib/auth";

const AuthUserContext = createContext<AuthenticatedUser | null>(null);

export function AuthUserProvider({
  user,
  children,
}: {
  user: AuthenticatedUser;
  children: ReactNode;
}) {
  return (
    <AuthUserContext.Provider value={user}>{children}</AuthUserContext.Provider>
  );
}

export function useAuthUser() {
  const user = useContext(AuthUserContext);

  if (!user) {
    throw new Error("useAuthUser must be used within AuthUserProvider.");
  }

  return user;
}
