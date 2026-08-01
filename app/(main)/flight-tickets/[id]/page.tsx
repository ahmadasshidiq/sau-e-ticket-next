"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft02Icon,
  AiContentGenerator01Icon,
  Delete02Icon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect, type SearchableSelectOption } from "@/components/searchable-select";
import { useDebouncedRemoteSearch } from "@/hooks/use-debounced-remote-search";
import { toast } from "@/lib/toast";
import { SelectField } from "@/components/select-field";
import {
  sumFlightOptionDurations,
  type FlightOption,
} from "@/lib/flight-ticket/flight-options";

type Passenger = {
  id?: string;
  rankId?: string | null;
  rankName?: string | null;
  title?: string | null;
  name: string;
  passengerType?: string | null;
  baggage?: string | null;
  ticketNumber?: string | null;
};

type RankOption = {
  id: string;
  name: string;
};

type FlightTicketDetail = {
  id: string;
  functionCategory: "CREWING_TANKER" | "CMOS" | "TAD" | null;
  vesselId: string | null;
  vesselName: string | null;
  vesselType: "CREWING_TANKER" | "CMOS" | "TAD" | null;
  assign: "Sign On" | "Sign Off" | null;
  serviceMode: "Flight" | "Train" | "Bus" | null;
  bookingReference: string | null;
  docDate: string | null;
  provider: string | null;
  status: "DRAFT" | "GENERATED";
  pnr: string | null;
  ticketNumber: string | null;
  airline: string | null;
  flightNumber: string | null;
  cabinClass: string | null;
  departureCity: string | null;
  arrivalCity: string | null;
  departureAirport: string | null;
  arrivalAirport: string | null;
  departureTerminal: string | null;
  departureDate: string | null;
  arrivalDate: string | null;
  departureTime: string | null;
  arrivalTerminal: string | null;
  arrivalTime: string | null;
  duration: string | null;
  farePerPax: string | null;
  ntaFare: string | null;
  quantity: number;
  grandTotal: string | null;
  selectedFlightOptionKey: string | null;
  flightOptions: FlightOption[];
  passengers: Passenger[];
};

type VesselOption = {
  id: string;
  name: string;
  type: "CREWING_TANKER" | "CMOS" | "TAD";
};

const emptyPassenger: Passenger = {
  rankId: null,
  rankName: null,
  title: "",
  name: "",
  passengerType: "",
  baggage: "",
  ticketNumber: "",
};

const fieldClassName = "h-[46px] rounded-[14px] border-[#d1d5db] bg-white px-4 text-[14px] text-[#111827] placeholder:text-[#9ca3af] focus-visible:border-[#4438ff] focus-visible:ring-[color:rgba(68,56,255,0.12)] dark:border-white/10 dark:bg-[#151d2c] dark:text-white dark:placeholder:text-[#64748b]";

const sectionClassName =
  "rounded-[28px] border border-[#e5e7eb] bg-white p-6 dark:border-white/10 dark:bg-[#111827]";

function parseCurrencyInput(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return value.replace(/[^\d]/g, "");
}

function formatCurrencyInput(value: string | null | undefined) {
  const digits = parseCurrencyInput(value);
  if (!digits) {
    return "";
  }

  return new Intl.NumberFormat("id-ID").format(Number(digits));
}

function computeGrandTotal(
  farePerPax: string | null | undefined,
  quantity: number | null | undefined
) {
  const normalizedFare = Number(parseCurrencyInput(farePerPax));
  const normalizedQuantity = Number(quantity ?? 0);

  if (!normalizedFare || !normalizedQuantity) {
    return null;
  }

  return String(normalizedFare * normalizedQuantity);
}

function resolvePassengerQuantity(passengers: Passenger[] | null | undefined) {
  return Math.max(passengers?.length ?? 0, 1);
}

function syncTicketPassengerQuantity(ticket: FlightTicketDetail): FlightTicketDetail {
  const quantity = resolvePassengerQuantity(ticket.passengers);

  return {
    ...ticket,
    quantity,
    grandTotal: computeGrandTotal(ticket.farePerPax, quantity),
  };
}

function reindexPassengerMap<T>(source: Record<number, T>, removedIndex: number) {
  return Object.entries(source).reduce<Record<number, T>>((accumulator, entry) => {
    const index = Number(entry[0]);
    const value = entry[1] as T;

    if (index === removedIndex) {
      return accumulator;
    }

    accumulator[index > removedIndex ? index - 1 : index] = value;
    return accumulator;
  }, {});
}

function summarizeFlightItinerary(ticket: FlightTicketDetail): FlightTicketDetail {
  if (ticket.flightOptions.length < 2) {
    return ticket;
  }

  const firstOption = ticket.flightOptions[0];
  const lastOption = ticket.flightOptions[ticket.flightOptions.length - 1];

  return {
    ...ticket,
    selectedFlightOptionKey: null,
    airline: firstOption.airline ?? null,
    flightNumber: firstOption.flightNumber ?? null,
    cabinClass: firstOption.cabinClass ?? null,
    departureCity: firstOption.departureCity ?? null,
    arrivalCity: lastOption.arrivalCity ?? null,
    departureAirport: firstOption.departureAirport ?? null,
    arrivalAirport: lastOption.arrivalAirport ?? null,
    departureTerminal: firstOption.departureTerminal ?? null,
    arrivalTerminal: lastOption.arrivalTerminal ?? null,
    departureDate: firstOption.departureDate ?? null,
    arrivalDate: lastOption.arrivalDate ?? null,
    departureTime: firstOption.departureTime ?? null,
    arrivalTime: lastOption.arrivalTime ?? null,
    duration: sumFlightOptionDurations(ticket.flightOptions),
  };
}

export default function ValidateFlightTicketPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [ticket, setTicket] = useState<FlightTicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [vesselSearch, setVesselSearch] = useState("");
  const [isVesselOpen, setIsVesselOpen] = useState(false);
  const [rankSearches, setRankSearches] = useState<Record<number, string>>({});
  const [rankOptions, setRankOptions] = useState<Record<number, RankOption[]>>({});
  const [rankLoading, setRankLoading] = useState<Record<number, boolean>>({});
  const [openRankIndex, setOpenRankIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!params.id) {
      return;
    }

    fetch(`/api/flight-tickets/${params.id}`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Failed to load flight ticket.");
        }

        return response.json();
      })
      .then((result) => {
        setTicket(
          syncTicketPassengerQuantity(
            summarizeFlightItinerary(result as FlightTicketDetail)
          )
        );
        setVesselSearch(result.vesselName ?? "");
        setRankSearches(
          Array.isArray(result.passengers)
            ? Object.fromEntries(
                result.passengers.map((passenger: Passenger, index: number) => [
                  index,
                  passenger.rankName ?? "",
                ])
              )
            : {}
        );
      })
      .catch((error: unknown) => {
        toast({
          title: "Failed to load ticket",
          description:
            error instanceof Error ? error.message : "Unknown error occurred.",
          variant: "destructive",
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [params.id]);

  const {
    items: vesselOptions,
    loading: vesselLoading,
    setItems: setVesselOptions,
  } = useDebouncedRemoteSearch<VesselOption>({
    query: vesselSearch,
    enabled: Boolean(ticket?.functionCategory),
    deps: [ticket?.functionCategory],
    search: async (query, signal) => {
      const searchParams = new URLSearchParams({
        page: "1",
        pageSize: "10",
        type: ticket?.functionCategory ?? "",
      });

      if (query.trim()) {
        searchParams.set("name", query.trim());
      }

      const response = await fetch(`/api/vessels?${searchParams.toString()}`, {
        cache: "no-store",
        signal,
      });

      if (!response.ok) {
        throw new Error("Failed to load vessels.");
      }

      const result = (await response.json()) as {
        data?: VesselOption[];
      };

      return result.data ?? [];
    },
    onError: (error) => {
      toast({
        title: "Failed to load vessels",
        description:
          error instanceof Error ? error.message : "Unknown error occurred.",
        variant: "destructive",
      });
    },
  });

  const {
    items: activeRankItems,
    loading: activeRankLoading,
  } = useDebouncedRemoteSearch<RankOption>({
    query: openRankIndex !== null ? rankSearches[openRankIndex] ?? "" : "",
    enabled: openRankIndex !== null,
    search: async (query, signal) => {
      const searchParams = new URLSearchParams({
        page: "1",
        pageSize: "10",
      });

      if (query.trim()) {
        searchParams.set("name", query.trim());
      }

      const response = await fetch(`/api/ranks?${searchParams.toString()}`, {
        cache: "no-store",
        signal,
      });

      if (!response.ok) {
        throw new Error("Failed to load ranks.");
      }

      const result = (await response.json()) as {
        data?: RankOption[];
      };

      return result.data ?? [];
    },
    onError: (error) => {
      toast({
        title: "Failed to load ranks",
        description:
          error instanceof Error ? error.message : "Unknown error occurred.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (openRankIndex === null) {
      return;
    }

    setRankOptions((current) => ({
      ...current,
      [openRankIndex]: activeRankItems,
    }));
  }, [activeRankItems, openRankIndex]);

  useEffect(() => {
    if (openRankIndex === null) {
      return;
    }

    setRankLoading((current) => ({
      ...current,
      [openRankIndex]: activeRankLoading,
    }));
  }, [activeRankLoading, openRankIndex]);

  function updateField<Key extends keyof FlightTicketDetail>(
    key: Key,
    value: FlightTicketDetail[Key]
  ) {
    setTicket((current) => {
      if (!current) {
        return current;
      }

      const nextTicket = { ...current, [key]: value };

      if (key === "farePerPax") {
        nextTicket.grandTotal = computeGrandTotal(
          value as FlightTicketDetail["farePerPax"],
          nextTicket.quantity
        );
      }

      return nextTicket;
    });
  }

  function updatePassenger(index: number, key: keyof Passenger, value: string) {
    setTicket((current) => {
      if (!current) return current;

      const nextPassengers = [...current.passengers];
      nextPassengers[index] = {
        ...nextPassengers[index],
        [key]: value,
      };

      return syncTicketPassengerQuantity({
        ...current,
        passengers: nextPassengers,
      });
    });
  }

  function removePassenger(index: number) {
    setTicket((current) => {
      if (!current) return current;

      if (current.passengers.length <= 1) {
        return current;
      }

      return syncTicketPassengerQuantity({
        ...current,
        passengers: current.passengers.filter((_, passengerIndex) => passengerIndex !== index),
      });
    });

    setRankSearches((current) => reindexPassengerMap(current, index));
    setRankOptions((current) => reindexPassengerMap(current, index));
    setRankLoading((current) => reindexPassengerMap(current, index));
    setOpenRankIndex((current) => {
      if (current === null) return current;
      if (current === index) return null;
      return current > index ? current - 1 : current;
    });
  }

  async function saveDraft() {
    if (!ticket) return null;

    setSaving(true);

    try {
      const response = await fetch(`/api/flight-tickets/${ticket.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...ticket,
          status: "DRAFT",
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message ?? "Failed to save flight ticket.");
      }

      setTicket(result);
      toast({
        title: "Draft saved",
        description: "Flight ticket draft has been updated.",
        variant: "success",
      });

      return result as FlightTicketDetail;
    } catch (error) {
      toast({
        title: "Save failed",
        description:
          error instanceof Error ? error.message : "Unknown error occurred.",
        variant: "destructive",
      });

      return null;
    } finally {
      setSaving(false);
    }
  }

  async function generateDocument() {
    if (!ticket) return;

    setGenerating(true);

    try {
      const savedTicket = await saveDraft();
      if (!savedTicket) {
        return;
      }

      const printWindow = window.open(
        `/api/flight-tickets/${savedTicket.id}/generate`,
        "_blank",
        "noopener,noreferrer"
      );

      if (!printWindow) {
        throw new Error("Popup blocked. Please allow popups for this site.");
      }

      toast({
        title: "Document generated",
        description: "Print preview opened. Save it as PDF from the print dialog.",
        variant: "success",
      });

      router.refresh();
    } catch (error) {
      toast({
        title: "Generate failed",
        description:
          error instanceof Error ? error.message : "Unknown error occurred.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <DashboardShell
      title="Validate Flight Ticket Data"
      description="Review and complete the flight ticket draft before generating the final document."
    >
      <div className="min-w-0 w-full max-w-[1320px] space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="inline-flex rounded-full bg-[#fff3e4] px-4 py-2 text-sm font-semibold text-[#f58a07] dark:bg-[#3a2a14] dark:text-[#ffbf66]">
            {ticket?.status ?? "DRAFT"} Document
          </span>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              className="h-[42px] rounded-[10px] border-[#d1d5db] px-5 text-[15px] text-[#374151] dark:border-white/10 dark:bg-[#111827] dark:text-[#d1d5db]"
              onClick={() => router.push("/flight-tickets")}
            >
              <HugeiconsIcon icon={ArrowLeft02Icon} size={22} strokeWidth={2} />
              Back
            </Button>
            <Button
              className="h-[42px] rounded-[10px] bg-[#15A726] px-5 text-[15px] text-white hover:bg-[#3CE550]"
              onClick={() => void saveDraft()}
              disabled={saving}
            >
              {saving ? (
                <>
                  <HugeiconsIcon icon={Loading03Icon} size={18} className="animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Draft"
              )}
            </Button>
            <Button
              className="h-[42px] rounded-[10px] bg-[#4b44f5] px-5 text-[15px] text-white hover:bg-[#3f39dc]"
              onClick={() => void generateDocument()}
              disabled={generating || loading || !ticket}
            >
              {generating ? (
                <>
                  <HugeiconsIcon icon={Loading03Icon} size={18} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <HugeiconsIcon icon={AiContentGenerator01Icon} size={18} strokeWidth={1.8} />
                  Generate Document
                </>
              )}
            </Button>
          </div>
        </div>

        {loading || !ticket ? (
          <div className={`${sectionClassName} px-8 py-16 text-center text-sm text-[#8b8b8b] dark:text-[#94a3b8]`}>
            Loading flight ticket data...
          </div>
        ) : (
          <div className="space-y-6">
            <section className={sectionClassName}>
              <div className="mb-5">
                <h2 className="text-lg font-semibold text-[#111827] dark:text-white">Category Selection</h2>
                <p className="mt-1 text-sm text-[#6b7280] dark:text-[#94a3b8]">
                  Complete the required category fields before validating the rest of the ticket data.
                </p>
              </div>
              <div className="grid gap-5 xl:grid-cols-4">
                <SelectField
                  label="Fungsi"
                  value={ticket.functionCategory ?? ""}
                  onChange={(value) => {
                    const nextFunctionCategory =
                      (value || null) as FlightTicketDetail["functionCategory"];

                    setTicket((current) =>
                      current
                        ? {
                            ...current,
                            functionCategory: nextFunctionCategory,
                            vesselId: null,
                            vesselName: null,
                            vesselType: null,
                          }
                        : current
                    );
                    setVesselSearch("");
                    setVesselOptions([]);
                    setIsVesselOpen(false);
                  }}
                  options={[
                    { label: "Crewing Tanker", value: "CREWING_TANKER" },
                    { label: "CMOS", value: "CMOS" },
                    { label: "TAD", value: "TAD" },
                  ]}
                />
                <SearchableSelect
                  label="Vessel"
                  value={vesselSearch}
                  selectedId={ticket.vesselId}
                  loading={vesselLoading}
                  open={isVesselOpen}
                  options={vesselOptions.map<SearchableSelectOption>((vessel) => ({
                    id: vessel.id,
                    label: vessel.name,
                    meta: vessel.type,
                  }))}
                  disabled={!ticket.functionCategory}
                  placeholder={!ticket.functionCategory ? "Select fungsi first" : "Search vessel name"}
                  onOpen={() => setIsVesselOpen(true)}
                  onClose={() => setIsVesselOpen(false)}
                  onChange={(value) => {
                    setVesselSearch(value);
                    setIsVesselOpen(true);
                    setTicket((current) =>
                      current
                        ? {
                            ...current,
                            vesselId: null,
                            vesselName: value || null,
                            vesselType: current.functionCategory,
                          }
                        : current
                    );
                  }}
                  onSelect={(option) => {
                    const vessel = vesselOptions.find((item) => item.id === option.id);
                    if (!vessel) return;

                    setVesselSearch(vessel.name);
                    setIsVesselOpen(false);
                    setTicket((current) =>
                      current
                        ? {
                            ...current,
                            vesselId: vessel.id,
                            vesselName: vessel.name,
                            vesselType: vessel.type,
                          }
                        : current
                    );
                  }}
                  loadingText="Loading vessels..."
                  emptyText="No vessels found."
                />
                <SelectField
                  label="Assign"
                  value={ticket.assign ?? ""}
                  onChange={(value) =>
                    updateField("assign", (value || null) as FlightTicketDetail["assign"])
                  }
                  options={[
                    { label: "Sign On", value: "Sign On" },
                    { label: "Sign Off", value: "Sign Off" },
                  ]}
                />
                <SelectField
                  label="Service Mode"
                  value={ticket.serviceMode ?? ""}
                  onChange={(value) =>
                    updateField(
                      "serviceMode",
                      (value || null) as FlightTicketDetail["serviceMode"]
                    )
                  }
                  options={[
                    { label: "Flight", value: "Flight" },
                    { label: "Train", value: "Train" },
                    { label: "Bus", value: "Bus" },
                  ]}
                />
                <Field
                  label="Reference Number"
                  value={ticket.bookingReference}
                  onChange={(value) => updateField("bookingReference", value)}
                />
                <Field
                  label="Doc Date"
                  type="date"
                  value={ticket.docDate ? ticket.docDate.slice(0, 10) : ""}
                  onChange={(value) => updateField("docDate", value || null)}
                />
              </div>
            </section>

            <section className={sectionClassName}>
              <div className="mb-5">
                <h2 className="text-lg font-semibold text-[#111827] dark:text-white">Ticketing Data</h2>
                <p className="mt-1 text-sm text-[#6b7280] dark:text-[#94a3b8]">
                  Complete or revise the ticket fields based on the uploaded document.
                </p>
              </div>
              <div className="grid gap-5 xl:grid-cols-4">
                <Field label="PNR / Booking Code" value={ticket.pnr} onChange={(value) => updateField("pnr", value)} />
                <Field label="Provider" value={ticket.provider} onChange={(value) => updateField("provider", value)} />
                <Field label="Ticket ID" value={ticket.id} onChange={() => undefined} readOnly />
                <Field label="Ticket Number" value={ticket.ticketNumber} onChange={(value) => updateField("ticketNumber", value)} />
                <Field label="Airline" value={ticket.airline} onChange={(value) => updateField("airline", value)} />
                <Field label="Flight Number" value={ticket.flightNumber} onChange={(value) => updateField("flightNumber", value)} />
                <Field label="Cabin Class" value={ticket.cabinClass} onChange={(value) => updateField("cabinClass", value)} />
                <Field label="Departure Date" type="date" value={ticket.departureDate ? ticket.departureDate.slice(0, 10) : ""} onChange={(value) => updateField("departureDate", value || null)} />
                <Field label="Departure Time" value={ticket.departureTime} onChange={(value) => updateField("departureTime", value)} />
                <Field label="Departure City" value={ticket.departureCity} onChange={(value) => updateField("departureCity", value)} />
                <Field label="Departure Airport" value={ticket.departureAirport} onChange={(value) => updateField("departureAirport", value)} />
                <Field label="Departure Terminal" value={ticket.departureTerminal} onChange={(value) => updateField("departureTerminal", value)} />
                <Field label="Arrival Date" type="date" value={ticket.arrivalDate ? ticket.arrivalDate.slice(0, 10) : ""} onChange={(value) => updateField("arrivalDate", value || null)} />
                <Field label="Arrival Time" value={ticket.arrivalTime} onChange={(value) => updateField("arrivalTime", value)} />
                <Field label="Arrival City" value={ticket.arrivalCity} onChange={(value) => updateField("arrivalCity", value)} />
                <Field label="Arrival Airport" value={ticket.arrivalAirport} onChange={(value) => updateField("arrivalAirport", value)} />
                <Field label="Duration" value={ticket.duration} onChange={(value) => updateField("duration", value)} />
              </div>
            </section>

            <section className={sectionClassName}>
              <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-[#111827] dark:text-white">Passenger Detail</h2>
                  <p className="mt-1 text-sm text-[#6b7280] dark:text-[#94a3b8]">
                    Review title, passenger name, ticket number, passenger type, and checked baggage for each passenger.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="h-[44px] rounded-[14px] border-[#d1d5db] px-4 text-[14px] text-[#374151] dark:border-white/10 dark:bg-[#111827] dark:text-[#d1d5db]"
                  onClick={() =>
                    setTicket((current) =>
                      current
                        ? syncTicketPassengerQuantity({
                            ...current,
                            passengers: [...current.passengers, { ...emptyPassenger }],
                          })
                        : current
                    )
                  }
                >
                  Add Passenger
                </Button>
              </div>

              <div className="space-y-4">
                {ticket.passengers.map((passenger, index) => (
                  <div
                    key={passenger.id ?? index}
                    className="rounded-[20px] border border-[#edf0f7] bg-[#fafcff] p-5 dark:border-white/10 dark:bg-[#151d2c]"
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-[#6b7280] dark:text-[#94a3b8]">
                        Passenger {index + 1}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removePassenger(index)}
                        disabled={ticket.passengers.length <= 1}
                        className="text-[#dc2626] hover:bg-[#fef2f2] hover:text-[#dc2626] disabled:opacity-40 dark:text-red-300 dark:hover:bg-red-500/10 dark:hover:text-red-200"
                      >
                        <HugeiconsIcon icon={Delete02Icon} size={18} strokeWidth={1.8} />
                      </Button>
                    </div>
                    <div className="grid gap-5 xl:grid-cols-7">
                      <div className="xl:col-span-1">
                        <SelectField
                          label="Title"
                          value={passenger.title ?? ""}
                          onChange={(value) => updatePassenger(index, "title", value)}
                          options={[
                            { label: "Mr.", value: "Mr." },
                            { label: "Mrs.", value: "Mrs." },
                            { label: "Ms.", value: "Ms." },
                          ]}
                        />
                      </div>
                      <div className="xl:col-span-2">
                        <Field
                          label="Passenger Name"
                          value={passenger.name}
                          onChange={(value) => updatePassenger(index, "name", value)}
                        />
                      </div>
                      <div className="xl:col-span-1">
                        <SearchableSelect
                          label="Rank"
                          value={rankSearches[index] ?? passenger.rankName ?? ""}
                          selectedId={passenger.rankId ?? null}
                          loading={rankLoading[index] ?? false}
                          open={openRankIndex === index}
                          options={(rankOptions[index] ?? []).map<SearchableSelectOption>((rank) => ({
                            id: rank.id,
                            label: rank.name,
                          }))}
                          placeholder="Search rank"
                          onOpen={() => setOpenRankIndex(index)}
                          onClose={() =>
                            setOpenRankIndex((current) => (current === index ? null : current))
                          }
                          onChange={(value) => {
                            setRankSearches((current) => ({
                              ...current,
                              [index]: value,
                            }));
                            setOpenRankIndex(index);
                            setTicket((current) =>
                              current
                                ? {
                                    ...current,
                                    passengers: current.passengers.map((item, passengerIndex) =>
                                      passengerIndex === index
                                        ? {
                                            ...item,
                                            rankId: null,
                                            rankName: value || null,
                                          }
                                        : item
                                    ),
                                  }
                                : current
                            );
                          }}
                          onSelect={(option) => {
                            const rank = (rankOptions[index] ?? []).find(
                              (item) => item.id === option.id
                            );
                            if (!rank) return;

                            setRankSearches((current) => ({
                              ...current,
                              [index]: rank.name,
                            }));
                            setOpenRankIndex(null);
                            setTicket((current) =>
                              current
                                ? {
                                    ...current,
                                    passengers: current.passengers.map((item, passengerIndex) =>
                                      passengerIndex === index
                                        ? {
                                            ...item,
                                            rankId: rank.id,
                                            rankName: rank.name,
                                          }
                                        : item
                                    ),
                                  }
                                : current
                            );
                          }}
                          loadingText="Loading ranks..."
                          emptyText="No ranks found."
                        />
                      </div>
                      <div className="xl:col-span-1">
                        <Field
                          label="Ticket Number"
                          value={passenger.ticketNumber}
                          onChange={(value) => updatePassenger(index, "ticketNumber", value)}
                        />
                      </div>
                      <div className="xl:col-span-1">
                        <SelectField
                          label="Passenger Type"
                          value={passenger.passengerType ?? ""}
                          onChange={(value) => updatePassenger(index, "passengerType", value)}
                          options={[
                            { label: "Adult", value: "Adult" },
                            { label: "Child", value: "Child" },
                            { label: "Infant", value: "Infant" },
                          ]}
                        />
                      </div>
                      <div className="xl:col-span-1">
                        <Field
                          label="Checked Baggage"
                          value={passenger.baggage}
                          onChange={(value) => updatePassenger(index, "baggage", value)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className={sectionClassName}>
              <div className="mb-5">
                <h2 className="text-lg font-semibold text-[#111827] dark:text-white">Fare Detail</h2>
                <p className="mt-1 text-sm text-[#6b7280] dark:text-[#94a3b8]">
                  Fare per Pax is the ticket selling price. NTA Fare is the ticket purchase price and is for internal records only.
                </p>
              </div>
              <div className="grid gap-5 xl:grid-cols-3">
                <div className="space-y-5">
                  <CurrencyField
                    label="Fare per Pax"
                    value={ticket.farePerPax}
                    onChange={(value) => updateField("farePerPax", value)}
                  />
                  <CurrencyField
                    label="NTA Fare"
                    value={ticket.ntaFare}
                    onChange={(value) => updateField("ntaFare", value)}
                  />
                </div>
                <Field
                  label="Quantity"
                  value={String(ticket.quantity ?? 1)}
                  onChange={() => undefined}
                  type="number"
                  readOnly
                />
                <CurrencyField
                  label="Grand Total"
                  value={ticket.grandTotal}
                  onChange={(value) => updateField("grandTotal", value)}
                  readOnly
                />
              </div>
            </section>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

function CurrencyField({
  label,
  value,
  onChange,
  readOnly = false,
}: {
  label: string;
  value: string | null | undefined;
  onChange: (value: string) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="space-y-2.5">
      <Label className="text-[14px] font-medium text-[#374151] dark:text-[#d1d5db]">{label}</Label>
      <Input
        type="text"
        inputMode="numeric"
        value={formatCurrencyInput(value)}
        onChange={(event) => onChange(parseCurrencyInput(event.target.value))}
        readOnly={readOnly}
        className={readOnly ? `${fieldClassName} bg-[#f8fafc] text-[#6b7280] dark:bg-[#0f172a] dark:text-[#94a3b8]` : fieldClassName}
      />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  readOnly = false,
  disabled = false,
}: {
  label: string;
  value: string | null | undefined;
  onChange: (value: string) => void;
  type?: string;
  readOnly?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2.5">
      <Label className="text-[14px] font-medium text-[#374151] dark:text-[#d1d5db]">{label}</Label>
      <Input
        type={type}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        readOnly={readOnly}
        disabled={disabled}
        className={
          readOnly || disabled
            ? `${fieldClassName} bg-[#f8fafc] text-[#6b7280] dark:bg-[#0f172a] dark:text-[#94a3b8]`
            : fieldClassName
        }
      />
    </div>
  );
}
