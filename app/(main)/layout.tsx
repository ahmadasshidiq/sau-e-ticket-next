import type { ReactNode } from "react";
import { MainSidebar } from "@/components/main-sidebar";

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <main className="h-screen overflow-hidden bg-white px-5 py-4 text-[#1f1f1f] transition-colors dark:bg-[#090d14] dark:text-white sm:px-6 lg:px-8">
      <div className="flex h-full w-full gap-5">
        <MainSidebar />
        <section className="flex min-w-0 flex-1 flex-col overflow-hidden bg-white px-5 py-2 transition-colors dark:bg-[#090d14] sm:px-6 lg:px-6">
          <div className="mt-4 min-h-0 flex-1 overflow-auto">{children}</div>
        </section>
      </div>
    </main>
  );
}
