import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";

export default async function UsersLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return children;
}
