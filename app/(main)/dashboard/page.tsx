import { DashboardShell } from "@/components/dashboard-shell";

const summaryCards = [
  {
    title: "Total Documents",
    value: "1,248",
    note: "+18.2%",
    detail: "from last week",
    accent: "text-[#59cf88]",
    bg: "bg-[#f2edff]",
    icon: <SummaryIcon type="documents" />,
  },
  {
    title: "Completed",
    value: "1,156",
    note: "+16.7%",
    detail: "from last week",
    accent: "text-[#59cf88]",
    bg: "bg-[#eefaf1]",
    icon: <SummaryIcon type="completed" />,
  },
  {
    title: "Draft",
    value: "28",
    note: "+3.6%",
    detail: "from last week",
    accent: "text-[#ff9a44]",
    bg: "bg-[#fff4e8]",
    icon: <SummaryIcon type="draft" />,
  },
  {
    title: "Total Templates",
    value: "12",
    note: "To add, contact the dev",
    detail: "",
    accent: "text-[#9a9a9a]",
    bg: "bg-[#f2efff]",
    icon: <SummaryIcon type="templates" />,
  },
];

export default function DashboardPage() {
  return (
    <DashboardShell
      title="Dashboard"
      description="Overview of your document processing activity"
    >
      <div className="space-y-5">
        <section className="grid gap-4 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <article
              key={card.title}
              className="rounded-[22px] border border-[#e6e6e6] bg-white px-6 py-6 shadow-[0_4px_14px_rgba(15,23,42,0.02)] transition-colors dark:border-white/10 dark:bg-[#111827] dark:shadow-[0_16px_32px_rgba(2,6,23,0.28)]"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`flex size-[50px] shrink-0 items-center justify-center rounded-full ${card.bg} dark:bg-white/6`}
                >
                  {card.icon}
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-[#3c3c3c] dark:text-[#e5e7eb]">
                    {card.title}
                  </p>
                  <p className="mt-1 text-[20px] font-bold text-[#1b1b1b] dark:text-white">
                    {card.value}
                  </p>
                  <p className="mt-3 text-[12px]">
                    <span className={`font-semibold ${card.accent}`}>{card.note}</span>
                    {card.detail ? (
                      <span className="ml-1 text-[#8d8d8d] dark:text-[#94a3b8]">{card.detail}</span>
                    ) : null}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_355px]">
          {/* <article className="rounded-[22px] border border-[#e6e6e6] bg-white p-6">
            <h2 className="text-[13px] font-semibold text-[#2f2f2f]">
              Recent Documents
            </h2>
            <div className="mt-4 overflow-hidden rounded-[16px] border border-[#e6e6e6]">
              <div className="h-9 border-b border-[#ececec] bg-[#fafafa]" />
              <div className="min-h-[535px] bg-white" />
            </div>
            <p className="mt-4 text-[12px] text-[#9c9c9c]">Rows per page</p>
          </article> */}

          <div className="space-y-4">
            {/* <article className="rounded-[22px] border border-[#e6e6e6] bg-white p-6">
              <h2 className="text-[13px] font-semibold text-[#2f2f2f]">
                Document Type Distribution
              </h2>
              <div className="mt-4 flex items-center gap-5">
                <div className="relative flex size-[120px] items-center justify-center rounded-full bg-[conic-gradient(#9373ea_0deg_288deg,#4c92ff_288deg_360deg)]">
                  <div className="flex size-[82px] flex-col items-center justify-center rounded-full bg-white">
                    <span className="text-[14px] font-bold text-[#232323]">1,248</span>
                    <span className="mt-1 text-[11px] text-[#7f7f7f]">Total</span>
                  </div>
                </div>

                <div className="space-y-3 text-[12px] text-[#525252]">
                  <div className="flex items-center justify-between gap-6">
                    <span className="flex items-center gap-2">
                      <span className="size-2.5 rounded-full bg-[#4c92ff]" />
                      Invoices
                    </span>
                    <span className="font-semibold text-[#2f2f2f]">248</span>
                  </div>
                  <div className="flex items-center justify-between gap-6">
                    <span className="flex items-center gap-2">
                      <span className="size-2.5 rounded-full bg-[#9373ea]" />
                      Flight Tickets
                    </span>
                    <span className="font-semibold text-[#2f2f2f]">1000</span>
                  </div>
                </div>
              </div>
            </article>

            <article className="rounded-[22px] border border-[#e6e6e6] bg-white p-6">
              <h2 className="text-[13px] font-semibold text-[#2f2f2f]">
                System Usage
              </h2>
              <div className="mt-5">
                <div className="h-[24px] overflow-hidden rounded-full bg-[#e3e3e3]">
                  <div className="h-full w-[68%] rounded-full bg-[#ff8a95]" />
                </div>
                <div className="mt-4 flex items-center justify-between text-[12px]">
                  <span className="text-[#666]">Disk</span>
                  <span className="font-semibold text-[#2f2f2f]">68%</span>
                </div>
                <p className="mt-4 text-[12px] font-semibold text-[#424242]">
                  19,2 GB/60 GB
                </p>
              </div>
            </article> */}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}

function SummaryIcon({ type }: { type: "documents" | "completed" | "draft" | "templates" }) {
  if (type === "documents") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="size-6 text-[#8d79f0]" stroke="currentColor" strokeWidth="1.8">
        <path d="M8 3.5h7l4 4V18a2.5 2.5 0 0 1-2.5 2.5H8A3.5 3.5 0 0 1 4.5 17V7A3.5 3.5 0 0 1 8 3.5Z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9.5 10.5H15M9.5 14.5H13" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === "completed") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="size-6 text-[#67cf81]" stroke="currentColor" strokeWidth="1.8">
        <path d="m9.5 12 1.6 1.6 3.4-4.1" strokeLinecap="round" strokeLinejoin="round" />
        <path d="m12 3 2.2 1.2 2.5-.2 1.2 2.2 2.2 1.2-.2 2.5L21 12l-1.2 2.2.2 2.5-2.2 1.2-1.2 2.2-2.5-.2L12 21l-2.2-1.2-2.5.2-1.2-2.2-2.2-1.2.2-2.5L3 12l1.2-2.2-.2-2.5 2.2-1.2 1.2-2.2 2.5.2L12 3Z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (type === "draft") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="size-6 text-[#f5a446]" stroke="currentColor" strokeWidth="1.8">
        <path d="M8 3.5h7l4 4V18a2.5 2.5 0 0 1-2.5 2.5H8A3.5 3.5 0 0 1 4.5 17V7A3.5 3.5 0 0 1 8 3.5Z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 15h3.5M9 11h6" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-6 text-[#8b7df0]" stroke="currentColor" strokeWidth="1.8">
      <path d="M8 6.5A2.5 2.5 0 1 1 10.5 9H16a3.5 3.5 0 1 1 0 7h-5.5A2.5 2.5 0 1 1 8 18.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
