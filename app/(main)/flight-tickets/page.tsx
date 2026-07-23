"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Delete02Icon,
  PencilEdit02Icon,
  Upload06Icon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { DashboardShell } from "@/components/dashboard-shell";
import { DynamicPage, type DataColumn } from "@/components/dynamic-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectIcon,
  SelectItem,
  SelectList,
  SelectPortal,
  SelectPopup,
  SelectPositioner,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/lib/toast";
import {
  FLIGHT_TICKET_PROVIDERS,
  getFlightTicketProviderMeta,
} from "@/lib/flight-ticket/providers";

type FlightTicketRecord = {
  id: string;
  functionCategory: "CREWING_TANKER" | "CMOS" | "TAD" | null;
  assign: "Sign On" | "Sign Off" | null;
  serviceMode: "Flight" | "Train" | "Bus" | null;
  bookingReference: string | null;
  provider: string | null;
  status: "DRAFT" | "GENERATED";
  templateName: string | null;
  pnr: string | null;
  airline: string | null;
  departureCity: string | null;
  arrivalCity: string | null;
  departureDate: string | null;
  grandTotal: string | null;
  createdAt: string;
};

type FlightTicketRow = FlightTicketRecord & {
  functionCategoryDisplay: string;
  providerLabel: string;
  templateDisplay: string;
  departureDateDisplay: string;
  createdAtDisplay: string;
};

function truncateWords(value: unknown, maxWords = 3) {
  const text = String(value ?? "-").trim();
  if (!text || text === "-") {
    return "-";
  }

  const words = text.split(/\s+/);
  if (words.length <= maxWords) {
    return text;
  }

  return `${words.slice(0, maxWords).join(" ")}...`;
}

function renderTruncatedCell(value: unknown, maxWords = 3) {
  const fullText = String(value ?? "-");
  const shortText = truncateWords(value, maxWords);

  return (
    <span className="block truncate" title={fullText}>
      {shortText}
    </span>
  );
}

const CATEGORY_OPTIONS = [
  { label: "Crewing Tanker", value: "CREWING_TANKER" },
  { label: "CMOS", value: "CMOS" },
  { label: "TAD", value: "TAD" },
] as const;

const ASSIGN_OPTIONS = [
  { label: "Sign On", value: "Sign On" },
  { label: "Sign Off", value: "Sign Off" },
] as const;

const SERVICE_MODE_OPTIONS = [
  { label: "Flight", value: "Flight" },
  { label: "Train", value: "Train" },
  { label: "Bus", value: "Bus" },
] as const;

export default function FlightTicketsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [tickets, setTickets] = useState<FlightTicketRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>(
    FLIGHT_TICKET_PROVIDERS[0].value
  );
  const [selectedFunctionCategory, setSelectedFunctionCategory] = useState<string>("CMOS");
  const [selectedAssign, setSelectedAssign] = useState<string>("Sign On");
  const [selectedServiceMode, setSelectedServiceMode] = useState<string>("Flight");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [draftFilters, setDraftFilters] = useState<Record<string, string>>({
    keyword: "",
  });

  useEffect(() => {
    void loadTickets();
  }, []);

  async function loadTickets(currentKeyword = "") {
    setLoading(true);

    try {
      const params = new URLSearchParams();
      if (currentKeyword.trim()) {
        params.set("keyword", currentKeyword.trim());
      }

      const response = await fetch(`/api/flight-tickets?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to load flight tickets.");
      }

      const result = await response.json();
      setTickets(result.data ?? []);
    } catch (error) {
      toast({
        title: "Failed to load tickets",
        description:
          error instanceof Error ? error.message : "Unknown error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleUploadDocument() {
    if (!selectedFile) {
      toast({
        title: "Document required",
        description: "Choose a flight ticket file before uploading.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("provider", selectedProvider);
      formData.append("functionCategory", selectedFunctionCategory);
      formData.append("assign", selectedAssign);
      formData.append("serviceMode", selectedServiceMode);
      formData.append("file", selectedFile);

      const response = await fetch("/api/flight-tickets/scan", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? "Failed to upload document.");
      }

      setShowModal(false);
      setSelectedFile(null);
      setSelectedAssign("Sign On");
      setSelectedFunctionCategory("CMOS");
      setSelectedServiceMode("Flight");
      setDraftFilters({ keyword });
      await loadTickets(keyword);
      router.push(`/flight-tickets/${result.id}`);
    } catch (error) {
      toast({
        title: "Upload failed",
        description:
          error instanceof Error ? error.message : "Unknown error occurred.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(ticketId: string) {
    const confirmed = window.confirm(
      "Delete this flight ticket draft? This action cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(ticketId);

    try {
      const response = await fetch(`/api/flight-tickets/${ticketId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? "Failed to delete flight ticket.");
      }

      setTickets((current) => current.filter((ticket) => ticket.id !== ticketId));
      toast({
        title: "Flight ticket deleted",
        description: "The flight ticket has been removed successfully.",
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Delete failed",
        description:
          error instanceof Error ? error.message : "Unknown error occurred.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  }

  const rows = useMemo<FlightTicketRow[]>(
    () =>
      tickets.map((ticket) => {
        const providerMeta = getFlightTicketProviderMeta(ticket.provider);

        return {
          ...ticket,
          functionCategoryDisplay:
            ticket.functionCategory === "CREWING_TANKER"
              ? "Crewing Tanker"
              : ticket.functionCategory ?? "-",
          providerLabel: providerMeta.label,
          templateDisplay: ticket.templateName || providerMeta.templateName,
          departureDateDisplay: ticket.departureDate
            ? new Intl.DateTimeFormat("en-GB", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            }).format(new Date(ticket.departureDate))
            : "-",
          createdAtDisplay: new Intl.DateTimeFormat("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }).format(new Date(ticket.createdAt)),
        };
      }),
    [tickets]
  );

  const columns = useMemo<DataColumn<FlightTicketRow>[]>(
    () => [
      {
        key: "functionCategoryDisplay",
        title: "Fungsi",
        widthClassName: "w-[150px]",
      },
      {
        key: "assign",
        title: "Assign",
        widthClassName: "w-[120px]",
        formatter: (value: unknown) => String(value ?? "-"),
      },
      {
        key: "serviceMode",
        title: "Service Mode",
        widthClassName: "w-[130px]",
        formatter: (value: unknown) => String(value ?? "-"),
      },
      {
        key: "pnr",
        title: "PNR",
        widthClassName: "w-[110px]",
        formatter: (value: unknown) => String(value ?? "-"),
      },
      {
        key: "bookingReference",
        title: "Booking Reference",
        widthClassName: "w-[150px]",
        formatter: (value: unknown) => String(value ?? "-"),
      },
      {
        key: "providerLabel",
        title: "Provider",
        widthClassName: "w-[140px]",
      },
      {
        key: "airline",
        title: "Airline",
        widthClassName: "w-[170px]",
        textClassName: "max-w-[170px]",
        formatter: (value: unknown) => renderTruncatedCell(value, 3),
      },
      {
        key: "departureCity",
        title: "Departure City",
        widthClassName: "w-[150px]",
        textClassName: "max-w-[150px]",
        formatter: (value: unknown) => renderTruncatedCell(value, 3),
      },
      {
        key: "arrivalCity",
        title: "Arrival City",
        widthClassName: "w-[150px]",
        textClassName: "max-w-[150px]",
        formatter: (value: unknown) => renderTruncatedCell(value, 3),
      },
      {
        key: "departureDateDisplay",
        title: "Departure Date",
        widthClassName: "w-[130px]",
      },
      {
        key: "grandTotal",
        title: "Total",
        widthClassName: "w-[100px]",
        formatter: (value: unknown) => String(value ?? "-"),
      },
      {
        key: "status",
        title: "Status",
        widthClassName: "w-[130px]",
        formatter: (value: unknown) => (
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${value === "DRAFT"
              ? "bg-[#fff3e4] text-[#f58a07]"
              : "bg-[#ebf8ef] text-[#17803d]"
              }`}
          >
            {String(value ?? "-")}
          </span>
        ),
      },
      {
        key: "templateDisplay",
        title: "Template",
        widthClassName: "w-[180px]",
        textClassName: "max-w-[180px]",
        formatter: (value: unknown) => renderTruncatedCell(value, 3),
      },
      {
        key: "createdAtDisplay",
        title: "Created At",
        widthClassName: "w-[120px]",
        textClassName: "whitespace-nowrap",
      },
      {
        key: "actions",
        title: "Actions",
        align: "right" as const,
        widthClassName: "w-[110px]",
        formatter: (_value: unknown, row: FlightTicketRow) => (
          <div className="flex items-center justify-end gap-2">
            <Link
              href={`/flight-tickets/${row.id}`}
              aria-label="Validate flight ticket"
              title="Validate flight ticket"
              className="rounded-[10px] p-2 text-[#64748b] transition hover:bg-[#f8fafc] hover:text-[#334155] dark:text-[#94a3b8] dark:hover:bg-white/8 dark:hover:text-white"
            >
              <HugeiconsIcon icon={PencilEdit02Icon} size={18} strokeWidth={1.8} />
            </Link>
            <button
              type="button"
              onClick={() => void handleDelete(row.id)}
              disabled={deletingId === row.id}
              aria-label="Delete flight ticket"
              title="Delete flight ticket"
              className="rounded-[10px] p-2 text-[#dc2626] transition hover:bg-[#fef2f2] disabled:opacity-60 dark:text-red-300 dark:hover:bg-red-500/10"
            >
              <HugeiconsIcon icon={Delete02Icon} size={18} strokeWidth={1.8} />
            </button>
          </div>
        ),
      },
    ],
    [deletingId]
  );

  const filterContent = useMemo<ReactNode>(
    () => (
      <div className="space-y-4">
        <div className="space-y-2.5">
          <Label className="text-[14px] font-medium text-[#374151] dark:text-[#d1d5db]">
            Search keyword
          </Label>
          <Input
            value={draftFilters.keyword ?? ""}
            onChange={(event) =>
              setDraftFilters((current) => ({
                ...current,
                keyword: event.target.value,
              }))
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                setKeyword(draftFilters.keyword ?? "");
                void loadTickets(draftFilters.keyword ?? "");
              }
            }}
            placeholder="Search by PNR, airline, or ticket number"
            className="h-[48px] rounded-[14px] border-[#d1d5db] bg-white px-4 text-[14px] text-[#111827] placeholder:text-[#94a3b8] focus-visible:ring-2 focus-visible:ring-[#6366f1]/30 dark:border-white/10 dark:bg-[#151d2c] dark:text-white dark:placeholder:text-[#64748b]"
          />
        </div>
      </div>
    ),
    [draftFilters.keyword]
  );

  return (
    <DashboardShell
      title="Flight Ticket"
      description="Overview of flight ticket document processing activity"
    >
      <DynamicPage
        columns={columns}
        rows={rows}
        loading={loading}
        rowKey={(row) => row.id}
        filterFields={[
          {
            key: "keyword",
            label: "Keyword",
            placeholder: "Search by PNR, airline, or ticket number",
          },
        ]}
        filterValues={draftFilters}
        onFilterValuesChange={setDraftFilters}
        onApplyFilters={(values) => {
          const nextKeyword = values.keyword ?? "";
          setKeyword(nextKeyword);
          void loadTickets(nextKeyword);
        }}
        onResetFilters={() => {
          setDraftFilters({ keyword: "" });
          setKeyword("");
          void loadTickets("");
        }}
        filterContent={filterContent}
        primaryAction={{
          label: "Upload Document",
          onClick: () => setShowModal(true),
          icon: (
            <HugeiconsIcon icon={Upload06Icon} size={18} strokeWidth={1.8} />
          ),
        }}
      />

      {showModal ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[rgba(15,23,42,0.55)] px-4">
          <div className="w-full max-w-[840px] rounded-[28px] bg-white shadow-[0_30px_120px_rgba(15,23,42,0.2)] dark:bg-[#111827] dark:shadow-[0_30px_120px_rgba(2,6,23,0.55)]">
            <div className="overflow-hidden rounded-[28px]">
              <div className="border-b border-[#ebedf3] px-10 py-8 dark:border-white/10">
                <h2 className="text-[22px] font-bold text-[#111827] dark:text-white">
                  Upload Flight Ticket
                </h2>
                <p className="mt-2 text-sm text-[#7b7b86] dark:text-[#94a3b8]">
                  Upload your flight ticket document to create a draft. Ticket details will be filled manually or from the next extraction flow.
                </p>
              </div>

              <div className="space-y-7 px-10 py-6">
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2.5">
                    <Label className="text-[14px] font-medium text-[#374151] dark:text-[#d1d5db]">
                      Fungsi
                    </Label>
                    <Select
                      value={selectedFunctionCategory}
                      onValueChange={(value) => setSelectedFunctionCategory(String(value))}
                      items={CATEGORY_OPTIONS}
                    >
                      <SelectTrigger className="h-[42px] w-full rounded-[14px] border-[#d1d5db] bg-white px-5 text-[15px] text-[#111827] dark:border-white/10 dark:bg-[#151d2c] dark:text-white">
                        <SelectValue placeholder="Select fungsi" />
                        <SelectIcon />
                      </SelectTrigger>
                      <SelectPortal>
                        <SelectPositioner>
                          <SelectPopup>
                            <SelectList>
                              {CATEGORY_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectList>
                          </SelectPopup>
                        </SelectPositioner>
                      </SelectPortal>
                    </Select>
                  </div>

                  <div className="space-y-2.5">
                    <Label className="text-[14px] font-medium text-[#374151] dark:text-[#d1d5db]">
                      Assign
                    </Label>
                    <Select
                      value={selectedAssign}
                      onValueChange={(value) => setSelectedAssign(String(value))}
                      items={ASSIGN_OPTIONS}
                    >
                      <SelectTrigger className="h-[42px] w-full rounded-[14px] border-[#d1d5db] bg-white px-5 text-[15px] text-[#111827] dark:border-white/10 dark:bg-[#151d2c] dark:text-white">
                        <SelectValue placeholder="Select assign" />
                        <SelectIcon />
                      </SelectTrigger>
                      <SelectPortal>
                        <SelectPositioner>
                          <SelectPopup>
                            <SelectList>
                              {ASSIGN_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectList>
                          </SelectPopup>
                        </SelectPositioner>
                      </SelectPortal>
                    </Select>
                  </div>

                  <div className="space-y-2.5">
                    <Label className="text-[14px] font-medium text-[#374151] dark:text-[#d1d5db]">
                      Service Mode
                    </Label>
                    <Select
                      value={selectedServiceMode}
                      onValueChange={(value) => setSelectedServiceMode(String(value))}
                      items={SERVICE_MODE_OPTIONS}
                    >
                      <SelectTrigger className="h-[42px] w-full rounded-[14px] border-[#d1d5db] bg-white px-5 text-[15px] text-[#111827] dark:border-white/10 dark:bg-[#151d2c] dark:text-white">
                        <SelectValue placeholder="Select service mode" />
                        <SelectIcon />
                      </SelectTrigger>
                      <SelectPortal>
                        <SelectPositioner>
                          <SelectPopup>
                            <SelectList>
                              {SERVICE_MODE_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectList>
                          </SelectPopup>
                        </SelectPositioner>
                      </SelectPortal>
                    </Select>
                  </div>


                  <div className="space-y-2.5">
                    <Label className="text-[14px] font-medium text-[#374151] dark:text-[#d1d5db]">
                      Provider/Vendor
                    </Label>
                    <Select
                      value={selectedProvider}
                      onValueChange={(value) => setSelectedProvider(String(value))}
                      items={FLIGHT_TICKET_PROVIDERS}
                    >
                      <SelectTrigger className="h-[42px] rounded-[14px] border-[#d1d5db] bg-white px-5 text-[15px] text-[#111827] dark:border-white/10 dark:bg-[#151d2c] dark:text-white">
                        <SelectValue placeholder="Select provider/vendor" />
                        <SelectIcon />
                      </SelectTrigger>
                      <SelectPortal>
                        <SelectPositioner>
                          <SelectPopup>
                            <SelectList>
                              {FLIGHT_TICKET_PROVIDERS.map((provider) => (
                                <SelectItem key={provider.value} value={provider.value}>
                                  {provider.label}
                                </SelectItem>
                              ))}
                            </SelectList>
                          </SelectPopup>
                        </SelectPositioner>
                      </SelectPortal>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <Label className="text-[14px] font-medium text-[#374151] dark:text-[#d1d5db]">
                    Upload File
                  </Label>
                  <Button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    className="flex h-[232px] w-full flex-col items-center justify-center rounded-[14px] border-dashed border-[#8fa2ff] bg-[#f0f4ff] px-6 text-center transition hover:border-[#6f86ff] hover:bg-[#e8efff] dark:border-[#4c5ea8] dark:bg-[#141c33] dark:hover:border-[#7087ff] dark:hover:bg-[#182241]"
                  >
                    <p className="mt-4 text-sm font-medium text-[#5870ff] dark:text-[#8b90ff]">
                      Drag and drop file here or choose file
                    </p>
                    <p className="text-sm text-[#8b8fa4] dark:text-[#94a3b8]">
                      Supported format: PDF only (photos or screenshots of results are not accepted).
                    </p>
                    {selectedFile ? (
                      <p className="mt-4 rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#111827] dark:bg-[#111827] dark:text-white">
                        {selectedFile.name}
                      </p>
                    ) : null}
                  </Button>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpeg,.jpg,.png"
                    className="hidden"
                    onChange={(event) =>
                      setSelectedFile(event.target.files?.[0] ?? null)
                    }
                  />
                </div>

                <div className="flex items-center justify-end gap-3">
                  <Button
                    variant="outline"
                    className="h-[44px] rounded-[14px] border-[#d1d5db] px-6 text-[14px] text-[#374151] dark:border-white/10 dark:bg-[#111827] dark:text-[#d1d5db]"
                    onClick={() => {
                      setShowModal(false);
                      setSelectedFile(null);
                      setSelectedAssign("Sign On");
                      setSelectedFunctionCategory("CMOS");
                      setSelectedServiceMode("Flight");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="h-[44px] rounded-[14px] bg-[#4b44f5] px-6 text-[14px] text-white hover:bg-[#3f39dc]"
                    onClick={() => void handleUploadDocument()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <>
                        <HugeiconsIcon icon={Loading03Icon} size={18} className="animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      "Upload Document"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </DashboardShell>
  );
}
