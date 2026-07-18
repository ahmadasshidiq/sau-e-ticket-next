import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/theme-toggle";

export function DashboardShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
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
              <div className="size-[48px] shrink-0 rounded-full bg-[#d9d9d9] sm:size-[52px]" />
              <div className="min-w-0">
                <p className="truncate text-[16px] font-semibold tracking-[-0.03em] text-[#1f1f1f] dark:text-[#1f1f1f] sm:text-[18px] sm:dark:text-white">
                  Ahmad Ashidiq
                </p>
                <p className="mt-1 truncate text-[12px] text-[#8c8c8c] dark:text-[#8c8c8c] sm:dark:text-[#94a3b8]">
                  ahmad@gmail.com
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
