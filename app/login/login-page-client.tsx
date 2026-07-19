"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { toast } from "@/lib/toast";
import type { AppSettings } from "@/lib/app-settings";

export function LoginPageClient({
  settings,
  sessionEnded = false,
}: {
  settings: AppSettings;
  sessionEnded?: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const sessionEndedToastShownRef = useRef(false);

  useEffect(() => {
    if (!sessionEnded || sessionEndedToastShownRef.current) {
      return;
    }

    sessionEndedToastShownRef.current = true;

    toast({
      title: "Session ended",
      description: "Your session has ended because you logged in on another device",
      variant: "destructive",
    });
  }, [sessionEnded]);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          rememberMe,
        }),
      });

      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(result.message ?? "Login failed.");
      }

      toast({
        title: "Login success",
        description: "Go to the dashboard...",
        variant: "success",
      });
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      toast({
        title: "Login failed",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-white text-black transition-colors dark:bg-[#0f0f12] dark:text-white">
      <div className="absolute right-4 top-4 z-20 sm:right-8 sm:top-8">
        <ThemeToggle />
      </div>

      <div className="mx-auto flex min-h-screen w-full max-w-[1720px] items-center justify-center px-4 py-6 sm:px-8">
        <div className="grid w-full grid-cols-1 items-center gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:gap-24 xl:gap-32">
          <section className="grid min-h-[640px] grid-rows-[auto_1fr_auto] overflow-hidden rounded-[28px] bg-[#4438ff] px-8 py-8 text-white shadow-[0_20px_60px_rgba(52,44,255,0.22)] dark:bg-linear-to-br dark:from-[#1a2140] dark:to-[#101521] dark:shadow-[0_20px_60px_rgba(2,6,23,0.42)] sm:px-10 lg:h-[calc(100vh-40px)] lg:max-h-[960px]">
            {/* Logo */}
            <div className="flex items-start">
              <div className="relative h-12 w-[96px] rounded-[16px]">
                <Image
                  src={settings.logoWhite || "/img/logo-putih.png"}
                  alt={settings.applicationName}
                  fill
                  priority
                  className="object-contain"
                />
              </div>
            </div>

            <div className="flex items-center">
              <div className="max-w-[440px]">
                <h1 className="text-[43px] leading-[1.15] font-semibold tracking-[-0.03em] text-white">
                  Simplify your
                  <br />
                  document workflow
                </h1>

                <p className="mt-8 text-[20px] font-normal leading-[1.32] text-white/72 dark:text-[#b9c0d4]">
                  Upload invoices, tickets, and receipts to automatically extract, validate and generate documents in seconds.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-6">
              <div className="h-px flex-1 bg-white/70 dark:bg-white/16" />
              <p className="text-[30px] font-semibold leading-none tracking-[-0.03em] text-white">
                Lets&rsquo;go!
              </p>
            </div>
          </section>

          <section className="flex items-center justify-center pb-8 lg:min-h-[calc(100vh-40px)] lg:justify-start lg:pb-0">
            <div className="flex w-full max-w-[760px] items-center justify-center px-3 pt-2 pb-4 sm:px-5 lg:px-0 lg:pt-0 lg:pb-0">
              <div className="w-full max-w-[524px] pb-6 sm:pb-8">
                <div>
                  <h2 className="text-[38px] font-bold leading-[1.12] tracking-[-0.04em] text-black dark:text-white">
                    Hello Admin,
                    <br />
                    Welcome back
                  </h2>
                  <p className="mt-5 text-[15px] font-medium leading-[1.45] text-[#8B8F9C] dark:text-[#A9ACB8]">
                    Welcome back! Sign in to continue managing your document
                    workflow.
                  </p>
                </div>

                <form className="mt-12 w-full space-y-8 pb-4 sm:pb-6" onSubmit={(event) => void handleLogin(event)}>
                  <div className="space-y-4">
                    <Label
                      htmlFor="email"
                      className="text-[18px] leading-none font-semibold text-[#747884] dark:text-[#D9DCEA]"
                    >
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="enter email.."
                      disabled={submitting}
                      className="h-[53px] rounded-[16px] border-[#E1E3F0] bg-white px-7 text-medium text-black shadow-none placeholder:text-[#C4C0BA] focus-visible:border-[#4C3DFF] focus-visible:ring-[color:rgba(76,61,255,0.12)] dark:border-white/12 dark:bg-[#17181d] dark:text-white dark:placeholder:text-[#787D89]"
                    />
                  </div>

                  <div className="space-y-4">
                    <Label
                      htmlFor="password"
                      className="text-[18px] leading-none font-semibold text-[#747884] dark:text-[#D9DCEA]"
                    >
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="enter password.."
                      disabled={submitting}
                      className="h-[53px] rounded-[16px] border-[#E1E3F0] bg-white px-7 text-medium text-black shadow-none placeholder:text-[#C4C0BA] focus-visible:border-[#4C3DFF] focus-visible:ring-[color:rgba(76,61,255,0.12)] dark:border-white/12 dark:bg-[#17181d] dark:text-white dark:placeholder:text-[#787D89]"
                    />
                  </div>

                  <div className="flex items-center gap-4 pt-1">
                    <Checkbox
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(Boolean(checked))}
                      className="size-[26px] rounded-[10px] border-[#DCDFF0] bg-white text-white shadow-none data-[checked]:border-[#4C3DFF] data-[checked]:bg-[#4C3DFF] dark:border-white/20 dark:bg-[#17181d]"
                    />
                    <Label
                      htmlFor="remember"
                      className="cursor-pointer text-[h-[53px] rounded-[16px]px] leading-none font-semibold text-[#747884] dark:text-[#D9DCEA]"
                    >
                      Remember Me
                    </Label>
                  </div>

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="h-[67px] w-full rounded-[22px] bg-linear-to-r from-[#4C3DFF] to-[#342CFF] text-[18px] font-semibold text-white shadow-none hover:from-[#4738f0] hover:to-[#3028f0]"
                  >
                    {submitting ? "Signing in..." : "Login to your account"}
                  </Button>
                </form>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
