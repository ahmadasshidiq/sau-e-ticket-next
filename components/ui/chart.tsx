"use client"

import * as React from "react"
import * as RechartsPrimitive from "recharts"

import { cn } from "@/lib/utils"

export type ChartConfig = Record<
  string,
  {
    label?: string
    color?: string
  }
>

const ChartContext = React.createContext<{ config: ChartConfig } | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)

  if (!context) {
    throw new Error("useChart must be used within a ChartContainer")
  }

  return context
}

function ChartContainer({
  id,
  className,
  config,
  children,
}: React.ComponentProps<"div"> & {
  config: ChartConfig
  children: React.ComponentProps<
    typeof RechartsPrimitive.ResponsiveContainer
  >["children"]
}) {
  const uniqueId = React.useId()
  const chartId = `chart-${id ?? uniqueId.replace(/:/g, "")}`

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={chartId}
        className={cn(
          "flex aspect-auto justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-[#8d8d8d] [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-[#eef2f7] [&_.recharts-curve.recharts-tooltip-cursor]:stroke-[#dbe4f0] [&_.recharts-tooltip-wrapper]:outline-none dark:[&_.recharts-cartesian-axis-tick_text]:fill-[#94a3b8] dark:[&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-[#1f2937]",
          className
        )}
      >
        <style
          dangerouslySetInnerHTML={{
            __html: Object.entries(config)
              .map(
                ([key, value]) =>
                  `[data-chart=${chartId}] { --color-${key}: ${value.color}; }`
              )
              .join("\n"),
          }}
        />
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
}

const ChartTooltip = RechartsPrimitive.Tooltip

function ChartTooltipContent({
  active,
  payload,
  label,
  className,
  formatter,
}: React.ComponentProps<typeof RechartsPrimitive.Tooltip> & {
  className?: string
}) {
  const { config } = useChart()

  if (!active || !payload?.length) {
    return null
  }

  return (
    <div
      className={cn(
        "min-w-[180px] rounded-[16px] border border-[#e7ebf3] bg-white/98 px-4 py-3 shadow-[0_14px_30px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-[#0f172a]/95",
        className
      )}
    >
      {label ? (
        <div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#8d8d8d] dark:text-[#94a3b8]">
          {String(label)}
        </div>
      ) : null}

      <div className="space-y-2">
        {payload.map((item) => {
          const key = String(item.dataKey ?? "")
          const chartItem = config[key]
          const itemName = item.name ?? key
          const formatted =
            item.value !== undefined
              ? formatter?.(item.value, itemName, item, 0, payload)
              : undefined
          const formattedValue = Array.isArray(formatted)
            ? formatted[0]
            : item.value?.toLocaleString?.("id-ID") ?? item.value
          const formattedLabel = Array.isArray(formatted)
            ? formatted[1]
            : chartItem?.label ?? key

          return (
            <div key={key} className="flex items-center justify-between gap-4 text-[13px]">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: chartItem?.color ?? item.color ?? "#64748b" }}
                />
                <span className="text-[#4b5563] dark:text-[#d1d5db]">
                  {formattedLabel}
                </span>
              </div>
              <span className="font-semibold text-[#111827] dark:text-white">
                {formattedValue}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export { ChartContainer, ChartTooltip, ChartTooltipContent }
