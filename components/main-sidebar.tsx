"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import {
  Cancel01Icon,
  Home01Icon,
  Invoice01Icon,
  AirplaneLanding01Icon,
  Settings05Icon,
  UserMultipleIcon,
  Logout01Icon,
  Menu02Icon,
  BoatIcon,
  RankingIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useAuthUser } from "@/components/auth-user-provider";
import { toast } from "@/lib/toast";
import type { AppSettings } from "@/lib/app-settings";

type NavItem = {
  label: string;
  href: string;
  icon: typeof Home01Icon;
};

const mainItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: Home01Icon },
];

const documentItems: NavItem[] = [
  { label: "Flight Ticket", href: "/flight-tickets", icon: AirplaneLanding01Icon },
  { label: "Invoice", href: "/invoices", icon: Invoice01Icon },
];

const systemItems: NavItem[] = [
  { label: "Users", href: "/users", icon: UserMultipleIcon },
  { label: "Vessel", href: "/vessels", icon: BoatIcon },
  { label: "Rank", href: "/ranks", icon: RankingIcon },
  { label: "Settings", href: "/settings", icon: Settings05Icon },
  { label: "Logout", href: "/login", icon: Logout01Icon },
];

const SIDEBAR_COLLAPSED_STORAGE_KEY = "main-sidebar-collapsed";

export function MainSidebar({ settings }: { settings: AppSettings }) {
  const user = useAuthUser();
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);
  const currentYear = new Date().getFullYear();
  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION ?? "v1.0-AA@tetrabit";

  useEffect(() => {
    const savedValue = window.localStorage.getItem(
      SIDEBAR_COLLAPSED_STORAGE_KEY
    );

    if (savedValue !== null) {
      setCollapsed(savedValue === "true");
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      SIDEBAR_COLLAPSED_STORAGE_KEY,
      String(collapsed)
    );
  }, [collapsed]);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  return (
    <>
      <button
        type="button"
        aria-label="Open sidebar"
        onClick={() => setIsMobileOpen(true)}
        className="fixed left-4 top-4 z-40 flex size-11 items-center justify-center rounded-2xl bg-linear-to-b from-[#4438ff] to-[#3a31f0] text-white shadow-[0_18px_40px_rgba(58,49,240,0.28)] dark:border dark:border-white/10 dark:from-[#182033] dark:to-[#101726] dark:text-white dark:shadow-[0_18px_40px_rgba(2,6,23,0.42)] lg:hidden"
      >
        <HugeiconsIcon icon={Menu02Icon} size={20} strokeWidth={2} />
      </button>

      <aside
        className={`sticky top-4 hidden h-[calc(100vh-2rem)] shrink-0 rounded-[28px] bg-linear-to-b from-[#4438ff] to-[#3a31f0] text-white shadow-[0_18px_40px_rgba(58,49,240,0.28)] transition-[width,padding] duration-300 dark:border dark:border-white/10 dark:from-[#182033] dark:to-[#101726] dark:text-white dark:shadow-[0_20px_44px_rgba(2,6,23,0.46)] lg:flex lg:flex-col ${collapsed ? "w-[82px] px-3 py-6" : "w-[312px] px-6 py-8"
          }`}
      >
        <SidebarContent
          collapsed={collapsed}
          pathname={pathname}
          currentYear={currentYear}
          appVersion={appVersion}
          settings={settings}
          role={user.role}
          onToggleCollapsed={() => setCollapsed((value) => !value)}
          onLogoutClick={() => setIsLogoutOpen(true)}
        />
      </aside>

      {isMobileOpen
        ? createPortal(
          <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] lg:hidden">
            <button
              type="button"
              aria-label="Close sidebar overlay"
              onClick={() => setIsMobileOpen(false)}
              className="absolute inset-0"
            />
            <aside className="relative flex h-full w-[min(86vw,320px)] flex-col bg-linear-to-b from-[#4438ff] to-[#3a31f0] px-5 py-6 text-white shadow-[0_18px_40px_rgba(58,49,240,0.28)] dark:border-r dark:border-white/10 dark:from-[#182033] dark:to-[#101726] dark:text-white dark:shadow-[0_20px_44px_rgba(2,6,23,0.46)]">
              <SidebarContent
                collapsed={false}
                pathname={pathname}
                currentYear={currentYear}
                appVersion={appVersion}
                settings={settings}
                role={user.role}
                mobile
                onCloseMobile={() => setIsMobileOpen(false)}
                onLogoutClick={() => setIsLogoutOpen(true)}
              />
            </aside>
          </div>,
          document.body
        )
        : null}

      {isLogoutOpen ? (
        <LogoutConfirmModal
          onCancel={() => setIsLogoutOpen(false)}
          onConfirm={async () => {
            setIsLogoutOpen(false);
            setIsMobileOpen(false);
            try {
              await fetch("/api/auth/logout", { method: "POST" });
              toast({
                title: "Logout success",
                description: "You have logged out of your current session.",
                variant: "success",
              });
            } finally {
              router.push("/login");
              router.refresh();
            }
          }}
        />
      ) : null}
    </>
  );
}

function SidebarContent({
  collapsed,
  pathname,
  currentYear,
  appVersion,
  settings,
  role,
  mobile = false,
  onToggleCollapsed,
  onCloseMobile,
  onLogoutClick,
}: {
  collapsed: boolean;
  pathname: string;
  currentYear: number;
  appVersion: string;
  settings: AppSettings;
  role: "ADMIN" | "USER";
  mobile?: boolean;
  onToggleCollapsed?: () => void;
  onCloseMobile?: () => void;
  onLogoutClick?: () => void;
}) {
  return (
    <>
      <div className={`flex ${collapsed ? "flex-col items-center gap-5" : "items-start justify-between"}`}>
        <div className={`relative ${collapsed ? "h-12 w-12" : "h-10 w-[70px]"}`}>
          {settings.logoWhite || settings.logoColored ? (
            <img
              src={settings.logoWhite || settings.logoColored || ""}
              alt={settings.applicationName}
              className="h-full w-full object-contain"
            />
          ) : (
            <Image
              src="/img/logo-putih.png"
              alt={settings.applicationName}
              fill
              priority
              className="object-contain"
            />
          )}
        </div>
        {mobile ? (
          <button
            type="button"
            aria-label="Close sidebar"
            onClick={onCloseMobile}
            className="flex size-9 items-center justify-center rounded-full text-white/88 transition hover:bg-white/10 dark:text-white/80 dark:hover:bg-white/8"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={20} strokeWidth={2} />
          </button>
        ) : (
          <button
            type="button"
            aria-label={collapsed ? "Expand menu" : "Collapse menu"}
            onClick={onToggleCollapsed}
            className={`flex size-9 items-center justify-center rounded-full text-white/88 transition hover:bg-white/10 dark:text-white/80 dark:hover:bg-white/8 ${!collapsed && "rotate-180"}`}
          >
            <HugeiconsIcon icon={Menu02Icon} size={18} strokeWidth={2} />
          </button>
        )}
      </div>

      <nav className={`flex flex-1 flex-col ${collapsed ? "mt-5 items-center" : "mt-8"}`}>
        <SidebarGroup
          title=""
          items={mainItems}
          pathname={pathname}
          collapsed={collapsed}
        />
        <SidebarGroup
          title="DOCUMENTS"
          items={documentItems}
          pathname={pathname}
          collapsed={collapsed}
          className={collapsed ? "mt-3" : "mt-6"}
        />
        <SidebarGroup
          title="SYSTEM"
          items={systemItems.filter((item) =>
            role === "ADMIN"
              ? true
              : !["Users", "Vessel", "Rank", "Settings"].includes(item.label)
          )}
          pathname={pathname}
          collapsed={collapsed}
          className={collapsed ? "mt-3" : "mt-6"}
          onLogoutClick={onLogoutClick}
        />
      </nav>

      <p
        className={`text-white/86 dark:text-white/55 ${collapsed ? "self-center text-center text-[10px] font-medium [writing-mode:vertical-rl] rotate-180" : "pt-6 text-[11px] font-medium"}`}
      >
        ©{currentYear} {settings.companyName || settings.applicationName} {appVersion}
      </p>
    </>
  );
}

function SidebarGroup({
  title,
  items,
  pathname,
  collapsed,
  className = "",
  onLogoutClick,
}: {
  title: string;
  items: NavItem[];
  pathname: string;
  collapsed: boolean;
  className?: string;
  onLogoutClick?: () => void;
}) {
  return (
    <div className={className}>
      {!collapsed && title && (
        <div className="mb-4 flex items-center gap-3 px-4">
          <span className="text-[12px] font-semibold tracking-[0.02em] text-white/88 dark:text-white/70">
            {title}
          </span>
          <div className="h-px flex-1 bg-white/55 dark:bg-white/16" />
        </div>
      )}

      <div className={collapsed ? "flex flex-col items-center gap-[14px]" : "space-y-2"}>
        {items.map((item) => {
          const isLogout = item.label === "Logout";
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && item.href !== "/login" && pathname.startsWith(item.href));

          const itemClassName =
            collapsed
              ? `flex h-[54px] w-[54px] items-center justify-center rounded-[16px] transition ${active
                ? "bg-[#7692ff] text-white shadow-[0_8px_20px_rgba(118,146,255,0.34)] dark:bg-[rgba(99,102,241,0.22)] dark:text-[#a5b4fc] dark:shadow-[0_10px_24px_rgba(79,70,229,0.18)]"
                : "text-white/95 hover:bg-white/10 dark:text-white/72 dark:hover:bg-white/8"
              }`
              : `flex h-[40px] w-full items-center gap-3 rounded-[12px] px-4 text-[16px] font-medium transition ${active
                ? "bg-[#7692ff] text-white shadow-[0_8px_20px_rgba(118,146,255,0.34)] dark:bg-[rgba(99,102,241,0.22)] dark:text-[#c7d2fe] dark:shadow-[0_10px_24px_rgba(79,70,229,0.18)]"
                : "text-white/92 hover:bg-white/10 dark:text-white/78 dark:hover:bg-white/8"
              }`;

          if (isLogout) {
            return (
              <button
                key={item.href + item.label}
                type="button"
                aria-label={item.label}
                title={item.label}
                onClick={onLogoutClick}
                className={`${itemClassName} cursor-pointer border-0 bg-transparent text-left outline-none appearance-none`}
              >
                <HugeiconsIcon
                  icon={item.icon}
                  size={collapsed ? 22 : 18}
                  strokeWidth={1.9}
                />
                {collapsed ? null : <span>{item.label}</span>}
              </button>
            );
          }

          return (
            <Link
              key={item.href + item.label}
              href={item.href}
              aria-label={item.label}
              title={item.label}
              className={itemClassName}
            >
              <HugeiconsIcon
                icon={item.icon}
                size={collapsed ? 22 : 18}
                strokeWidth={1.9}
              />
              {collapsed ? null : <span>{item.label}</span>}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function LogoutConfirmModal({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 p-4 backdrop-blur-[2px] dark:bg-[#020617]/55">
      <div className="w-full max-w-[460px] rounded-[24px] bg-white p-6 text-[#111827] shadow-[0_20px_48px_rgba(15,23,42,0.16)] dark:bg-[#111827] dark:text-white dark:shadow-[0_20px_52px_rgba(2,6,23,0.55)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[22px] font-semibold tracking-[-0.03em]">
              Logout
            </h2>
            <p className="mt-2 text-[14px] leading-6 text-[#6b7280] dark:text-[#94a3b8]">
              Are you sure you want to logout from this account?
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close logout modal"
            className="rounded-full p-1 text-[#6b7280] transition hover:text-[#111827] dark:text-[#94a3b8] dark:hover:text-white"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={20} strokeWidth={1.8} />
          </button>
        </div>

        <div className="mt-8 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-[12px] border border-[#d8d8d8] px-4 py-2.5 text-[14px] font-medium text-[#4b5563] transition hover:bg-[#f9fafb] dark:border-white/10 dark:text-[#d1d5db] dark:hover:bg-white/6"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-[12px] bg-[#4438ff] px-5 py-2.5 text-[14px] font-medium text-white transition hover:bg-[#3c31ec] dark:bg-[#5b61ff] dark:hover:bg-[#6970ff]"
          >
            Logout
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
