"use client"

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"
import { CheckIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"

function Checkbox({
  className,
  ...props
}: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "inline-flex size-6 items-center justify-center rounded-lg border border-border/80 bg-background text-white shadow-xs transition-all outline-none focus-visible:border-[color:var(--color-brand)] focus-visible:ring-4 focus-visible:ring-[color:var(--color-brand-ring)] data-[checked]:border-[color:var(--color-brand)] data-[checked]:bg-[color:var(--color-brand)] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        keepMounted
        className="flex items-center justify-center text-current transition data-[unchecked]:scale-50 data-[unchecked]:opacity-0 data-[checked]:scale-100 data-[checked]:opacity-100"
      >
        <HugeiconsIcon icon={CheckIcon} size={16} strokeWidth={2.2} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
