"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Cancel01Icon,
  CheckmarkCircle02Icon,
  InformationCircleIcon,
  Alert02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  dismissToast,
  subscribeToToasts,
  type ToastRecord,
} from "@/lib/toast";

export function Toaster() {
  const [mounted, setMounted] = useState(false);
  const [toasts, setToasts] = useState<ToastRecord[]>([]);

  useEffect(() => {
    setMounted(true);
    const unsubscribe = subscribeToToasts(setToasts);

    return () => {
      unsubscribe();
      setMounted(false);
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="pointer-events-none fixed right-4 top-4 z-[120] flex w-[calc(100vw-2rem)] max-w-[380px] flex-col gap-3">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>,
    document.body
  );
}

function ToastItem({ toast }: { toast: ToastRecord }) {
  const tone =
    toast.variant === "success"
      ? "border-[#b7ebc6] bg-[#f1fff5] text-[#14532d] dark:border-[#1f5f36] dark:bg-[#0d1f16] dark:text-[#86efac]"
      : toast.variant === "destructive"
        ? "border-[#fecaca] bg-[#fff5f5] text-[#7f1d1d] dark:border-[#7f1d1d] dark:bg-[#2a1111] dark:text-[#fca5a5]"
        : "border-[#dbe4ff] bg-white text-[#1f2937] dark:border-white/10 dark:bg-[#111827] dark:text-white";

  const icon =
    toast.variant === "success"
      ? CheckmarkCircle02Icon
      : toast.variant === "destructive"
        ? Alert02Icon
        : InformationCircleIcon;

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 rounded-[18px] border px-4 py-3 shadow-[0_16px_40px_rgba(15,23,42,0.14)] ${toast.open ? "animate-[toast-in_320ms_cubic-bezier(0.16,1,0.3,1)]" : "animate-[toast-out_320ms_cubic-bezier(0.4,0,1,1)_forwards]"} ${tone}`}
    >
      <div className="mt-0.5 shrink-0">
        <HugeiconsIcon icon={icon} size={20} strokeWidth={1.8} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold">{toast.title}</p>
        {toast.description ? (
          <p className="mt-1 text-[13px] opacity-80">{toast.description}</p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => dismissToast(toast.id)}
        className="shrink-0 rounded-full p-1 opacity-70 transition hover:opacity-100"
        aria-label="Dismiss toast"
      >
        <HugeiconsIcon icon={Cancel01Icon} size={18} strokeWidth={1.8} />
      </button>
    </div>
  );
}
