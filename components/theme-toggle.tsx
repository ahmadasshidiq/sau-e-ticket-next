"use client"

import { Moon02Icon, Sun03Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"

type Theme = "light" | "dark"

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark")
  document.documentElement.dataset.theme = theme
}

export function ThemeToggle() {
  function handleToggle() {
    const currentTheme =
      document.documentElement.dataset.theme === "dark" ? "dark" : "light"
    const nextTheme = currentTheme === "dark" ? "light" : "dark"

    applyTheme(nextTheme)
    window.localStorage.setItem("theme", nextTheme)
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-lg"
      className="rounded-full border border-[#e5e7eb] bg-white text-slate-700 shadow-[0_6px_18px_rgba(15,23,42,0.08)] backdrop-blur hover:bg-[#f8fafc] dark:border-[#e5e7eb] dark:bg-white dark:text-slate-700 dark:hover:bg-[#f8fafc]"
      onClick={handleToggle}
      aria-label="Toggle color mode"
    >
      <span className="dark:hidden">
        <HugeiconsIcon icon={Moon02Icon} size={18} />
      </span>
      <span className="hidden dark:inline-flex">
        <HugeiconsIcon icon={Sun03Icon} size={18} />
      </span>
    </Button>
  )
}
