import { getAppSettings } from "@/lib/app-settings";
import { getAuthenticatedUser } from "@/lib/auth";
import { LoginPageClient } from "./login-page-client";
import { redirect } from "next/navigation";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const user = await getAuthenticatedUser();

  if (user) {
    redirect("/dashboard");
  }

  const settings = await getAppSettings();
  const params = await searchParams;

  return (
    <LoginPageClient
      settings={settings}
      sessionEnded={params.reason === "session-ended"}
    />
  );
}
