"use client"

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
} from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

type DashboardTicketChartProps = {
  monthLabels: string[]
  monthlyTickets: number[]
  monthlyAmounts: number[]
}

const chartConfig = {
  tickets: {
    label: "Ticket Count",
    color: "#4f46e5",
  },
  amount: {
    label: "Amount (Rp)",
    color: "#14b8a6",
  },
} satisfies ChartConfig

function formatAmount(value: number) {
  return `Rp${new Intl.NumberFormat("id-ID").format(Math.round(value))}`
}

export function DashboardTicketChart({
  monthLabels,
  monthlyTickets,
  monthlyAmounts,
}: DashboardTicketChartProps) {
  const data = monthLabels.map((month, index) => ({
    month,
    tickets: monthlyTickets[index] ?? 0,
    amount: monthlyAmounts[index] ?? 0,
  }))

  const maxAmount = Math.max(...monthlyAmounts, 0)
  const amountTicks =
    maxAmount > 0
      ? Array.from({ length: 5 }, (_, index) => Math.round((maxAmount / 4) * index))
      : [0]

  return (
    <div className="space-y-4">
      <div className="rounded-[20px] border border-[#ececec] bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.03)] dark:border-white/10 dark:bg-[#111827]">
        <ChartContainer config={chartConfig} className="h-[320px] w-full">
          <ComposedChart
            accessibilityLayer
            data={data}
            margin={{ top: 16, right: 16, left: 4, bottom: 8 }}
          >
            <CartesianGrid vertical={false} strokeDasharray="4 4" />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tickMargin={10}
            />
            <YAxis
              yAxisId="left"
              width={42}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              width={62}
              axisLine={false}
              tickLine={false}
              ticks={amountTicks}
              tickFormatter={(value) => {
                if (value >= 1_000_000) {
                  return `${Math.round(value / 1_000_000)}M`
                }

                if (value >= 1_000) {
                  return `${Math.round(value / 1_000)}K`
                }

                return String(value)
              }}
            />
            <ChartTooltip
              cursor={{ fill: "rgba(79, 70, 229, 0.06)" }}
              content={
                <ChartTooltipContent
                  formatter={(value, name) => {
                    if (name === "amount") {
                      return [formatAmount(Number(value)), "Amount (Rp)"]
                    }

                    return [String(value), "Ticket Count"]
                  }}
                />
              }
            />
            <Bar
              yAxisId="left"
              dataKey="tickets"
              fill="var(--color-tickets)"
              radius={[10, 10, 0, 0]}
              barSize={26}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="amount"
              stroke="var(--color-amount)"
              strokeWidth={3}
              dot={{ r: 4, fill: "var(--color-amount)" }}
              activeDot={{ r: 5, fill: "var(--color-amount)" }}
            />
          </ComposedChart>
        </ChartContainer>
      </div>

      <div className="flex flex-wrap items-center gap-6 text-[13px] text-[#6b7280] dark:text-[#94a3b8]">
        <div className="flex items-center gap-2">
          <span className="h-3 w-6 rounded bg-[#4f46e5]" />
          <span>Ticket Count</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-[3px] w-7 rounded-full bg-[#14b8a6]" />
          <span>Amount</span>
        </div>
      </div>
    </div>
  )
}
