"use client"

import * as React from "react"
import { Select as SelectPrimitive } from "@base-ui/react/select"
import { ArrowDown01Icon, Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"

function Select({
  ...props
}: SelectPrimitive.Root.Props<any>) {
  return <SelectPrimitive.Root {...props} />
}

function SelectTrigger({
  className,
  ...props
}: SelectPrimitive.Trigger.Props) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(
        "flex h-[56px] w-full items-center justify-between gap-3 rounded-[16px] border border-[#d1d5db] bg-white px-5 text-[15px] text-[#111827] shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition-[border-color,box-shadow,background-color] hover:bg-white focus-visible:ring-2 focus-visible:ring-[#6366f1]/30 data-[popup-open]:border-[#6366f1] dark:border-white/10 dark:bg-[#151d2c] dark:text-white dark:hover:bg-[#151d2c]",
        className
      )}
      {...props}
    />
  )
}

function SelectValue({
  className,
  ...props
}: SelectPrimitive.Value.Props) {
  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      className={cn(
        "truncate text-left data-[placeholder]:text-[#94a3b8] dark:data-[placeholder]:text-[#64748b]",
        className
      )}
      {...props}
    />
  )
}

function SelectIcon({
  className,
  ...props
}: SelectPrimitive.Icon.Props) {
  return (
    <SelectPrimitive.Icon
      data-slot="select-icon"
      className={cn("shrink-0 text-[#374151] dark:text-[#d1d5db]", className)}
      {...props}
    >
      <HugeiconsIcon icon={ArrowDown01Icon} size={18} strokeWidth={1.8} />
    </SelectPrimitive.Icon>
  )
}

function SelectPortal(props: SelectPrimitive.Portal.Props) {
  return <SelectPrimitive.Portal {...props} />
}

function SelectPositioner({
  className,
  ...props
}: SelectPrimitive.Positioner.Props) {
  return (
    <SelectPrimitive.Positioner
      data-slot="select-positioner"
      className={cn("z-[140] outline-none select-none", className)}
      sideOffset={6}
      {...props}
    />
  )
}

function SelectPopup({
  className,
  ...props
}: SelectPrimitive.Popup.Props) {
  return (
    <SelectPrimitive.Popup
      data-slot="select-popup"
      className={cn(
        "pointer-events-auto min-w-[var(--anchor-width)] overflow-hidden rounded-[16px] border border-[#d1d5db] bg-white p-1 text-[#111827] shadow-[0_18px_40px_rgba(15,23,42,0.12)] transition-[transform,opacity] duration-100 data-ending-style:translate-y-1 data-ending-style:opacity-0 data-starting-style:-translate-y-1 data-starting-style:opacity-0 dark:border-white/10 dark:bg-[#151d2c] dark:text-white dark:shadow-[0_18px_40px_rgba(2,6,23,0.45)]",
        className
      )}
      {...props}
    />
  )
}

function SelectList({
  className,
  ...props
}: SelectPrimitive.List.Props) {
  return (
    <SelectPrimitive.List
      data-slot="select-list"
      className={cn("max-h-[280px] overflow-y-auto py-1", className)}
      {...props}
    />
  )
}

function SelectItem({
  className,
  children,
  ...props
}: SelectPrimitive.Item.Props) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "grid cursor-default grid-cols-[16px_1fr] items-center gap-3 rounded-[12px] px-3 py-2.5 text-[14px] outline-none select-none data-highlighted:bg-[#f3f4f6] dark:data-highlighted:bg-white/10",
        className
      )}
      {...props}
    >
      <SelectPrimitive.ItemIndicator className="text-[#4b44f5] dark:text-[#8b90ff]">
        <HugeiconsIcon icon={Tick02Icon} size={16} strokeWidth={1.8} />
      </SelectPrimitive.ItemIndicator>
      <SelectPrimitive.ItemText className="whitespace-nowrap">
        {children}
      </SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
}

export {
  Select,
  SelectIcon,
  SelectItem,
  SelectList,
  SelectPortal,
  SelectPopup,
  SelectPositioner,
  SelectTrigger,
  SelectValue,
}
