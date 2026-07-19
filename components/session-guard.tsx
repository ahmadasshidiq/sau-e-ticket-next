"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

export function SessionGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const redirectingRef = useRef(false);

  useEffect(() => {
    let disposed = false;

    async function checkSession() {
      if (redirectingRef.current || disposed) {
        return;
      }

      const response = await fetch("/api/auth/session", {
        cache: "no-store",
        credentials: "include",
      });

      if (response.status !== 401) {
        return;
      }

      redirectingRef.current = true;
      router.replace("/login?reason=session-ended");
      router.refresh();
    }

    void checkSession();

    function handleFocus() {
      void checkSession();
    }

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);
    const intervalId = window.setInterval(() => {
      void checkSession();
    }, 15000);

    return () => {
      disposed = true;
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
      window.clearInterval(intervalId);
    };
  }, [pathname, router]);

  return null;
}
