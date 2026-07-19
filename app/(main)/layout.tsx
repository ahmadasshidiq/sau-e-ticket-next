import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AuthUserProvider } from "@/components/auth-user-provider";
import { MainSidebar } from "@/components/main-sidebar";
import { SessionGuard } from "@/components/session-guard";
import { getAppSettings } from "@/lib/app-settings";
import { getAuthenticatedUser, getSessionToken } from "@/lib/auth";

export default async function MainLayout({ children }: { children: ReactNode }) {
  const sessionToken = await getSessionToken();
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect(sessionToken ? "/login?reason=session-ended" : "/login");
  }

  const settings = await getAppSettings();

  return (
    <main className="h-screen overflow-hidden bg-white px-5 py-4 text-[#1f1f1f] transition-colors dark:bg-[#090d14] dark:text-white sm:px-6 lg:px-8">
      <AuthUserProvider user={user}>
        <SessionGuard />
        <div className="flex h-full w-full gap-5">
          <MainSidebar settings={settings} />
          <section className="flex min-w-0 flex-1 flex-col overflow-hidden bg-white px-5 py-2 transition-colors dark:bg-[#090d14] sm:px-6 lg:px-6">
            <div className="mt-4 min-h-0 flex-1 overflow-auto">{children}</div>
          </section>
        </div>
      </AuthUserProvider>
    </main>
  );
}
