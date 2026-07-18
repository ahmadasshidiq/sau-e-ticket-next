import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({
  className,
  ...props
}: InputPrimitive.Props) {
  return (
    <InputPrimitive
      data-slot="input"
      className={cn(
        "flex h-14 w-full rounded-2xl border border-border/70 bg-background/80 px-5 text-base text-foreground shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-[border-color,box-shadow,background-color] outline-none placeholder:text-muted-foreground/80 focus-visible:border-[color:var(--color-brand)] focus-visible:ring-4 focus-visible:ring-[color:var(--color-brand-ring)] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-background/60",
        className
      )}
      {...props}
    />
  )
}

export { Input }
