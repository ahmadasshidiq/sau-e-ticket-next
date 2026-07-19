"use client";

import type { ReactNode } from "react";
import { useAuthUser } from "@/components/auth-user-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { getUserInitials } from "@/lib/user-display";

export function DashboardShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  const user = useAuthUser();
  const initials = getUserInitials(user.name);

  return (
    <div className="h-full">
      <div className="flex flex-col gap-5 sm:gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 pt-8 sm:pt-0">
          <h1 className="text-[28px] font-bold tracking-[-0.03em] text-[#1e1e1e] dark:text-white sm:text-[30px]">
            {title}
          </h1>
          <p className="mt-2 max-w-[520px] text-[14px] leading-6 text-[#8d8d8d] dark:text-[#9ca3af]">
            {description}
          </p>
        </div>
        <div className="flex w-full items-center justify-between gap-4 rounded-[20px] border border-[#ececec] bg-[#fafafa] px-4 py-3 dark:border-white/10 sm:justify-end sm:gap-5 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 lg:w-auto">
          <div className="flex w-full items-center justify-between gap-4 sm:w-auto sm:justify-end sm:gap-5">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <div className="flex size-[48px] shrink-0 items-center justify-center rounded-full bg-linear-to-br from-[#7c3aed] via-[#4f46e5] to-[#2563eb] text-[16px] font-bold tracking-[0.08em] text-white shadow-[0_12px_24px_rgba(79,70,229,0.24)] dark:from-[#1e293b] dark:via-[#334155] dark:to-[#475569] sm:size-[52px] sm:text-[17px]">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[16px] font-semibold tracking-[-0.03em] text-[#1f1f1f] dark:text-[#1f1f1f] sm:text-[18px] sm:dark:text-white">
                  {user.name}
                </p>
                <p className="mt-1 truncate text-[12px] text-[#8c8c8c] dark:text-[#8c8c8c] sm:dark:text-[#94a3b8]">
                  {user.email}
                </p>
              </div>
            </div>

            <ThemeToggle />
          </div>
        </div>
      </div>
      <div className="mt-8">{children}</div>
    </div>
  );
}
