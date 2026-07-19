"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Add01Icon,
  Cancel01Icon,
  Delete02Icon,
  Download01Icon,
  PencilEdit02Icon,
  Upload01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { VesselType } from "@prisma/client";
import { DashboardShell } from "@/components/dashboard-shell";
import { DynamicPage } from "@/components/dynamic-page";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/lib/toast";
import {
  buildEditVessel,
  buildVesselForm,
  buildVesselsSearchParams,
  defaultVesselForm,
  filterFields,
  getVesselColumns,
  mapVesselsToRows,
  pageDescription,
  pageTitle,
  vesselTypeOptions,
  type VesselApiRow,
  type VesselFormState,
  type VesselRow,
  type VesselsResponse,
} from "./page.config";

export default function VesselsPage() {
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [vessels, setVessels] = useState<VesselApiRow[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingVessel, setEditingVessel] = useState<VesselApiRow | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedImportFile, setSelectedImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [form, setForm] = useState<VesselFormState>(defaultVesselForm);
  const [draftFilters, setDraftFilters] = useState<Record<string, string>>({});
  const [appliedFilters, setAppliedFilters] = useState<Record<string, string>>({});

  async function loadVessels(
    nextPage = page,
    nextPageSize = pageSize,
    filters = appliedFilters
  ) {
    setLoading(true);

    try {
      const searchParams = buildVesselsSearchParams(nextPage, nextPageSize, filters);
      const response = await fetch(`/api/vessels?${searchParams.toString()}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to load vessels.");
      }

      const result = (await response.json()) as VesselsResponse;
      setVessels(result.data);
      setPage(result.meta.page);
      setPageSize(result.meta.pageSize);
      setTotalPages(result.meta.totalPages);
      setTotalRows(result.meta.total);
    } catch (error) {
      toast({
        title: "Failed to load vessels",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadVessels();
  }, []);

  const rows = useMemo<VesselRow[]>(
    () => mapVesselsToRows(vessels, (page - 1) * pageSize),
    [page, pageSize, vessels]
  );

  const columns = useMemo(
    () =>
      getVesselColumns((row) => (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => handleEdit(row)}
            aria-label="Edit vessel"
            title="Edit vessel"
            className="rounded-[10px] p-2 text-[#64748b] transition hover:bg-[#f8fafc] hover:text-[#334155] dark:text-[#94a3b8] dark:hover:bg-white/8 dark:hover:text-white"
          >
            <HugeiconsIcon icon={PencilEdit02Icon} size={18} strokeWidth={1.8} />
          </button>
          <button
            type="button"
            onClick={() => void handleDelete(row.id)}
            disabled={deletingId === row.id}
            aria-label="Delete vessel"
            title="Delete vessel"
            className="rounded-[10px] p-2 text-[#dc2626] transition hover:bg-[#fef2f2] disabled:opacity-60 dark:text-red-300 dark:hover:bg-red-500/10"
          >
            <HugeiconsIcon
              icon={Delete02Icon}
              size={18}
              strokeWidth={1.8}
              className={deletingId === row.id ? "opacity-60" : ""}
            />
          </button>
        </div>
      )),
    [deletingId]
  );

  function openCreateModal() {
    setEditingVessel(null);
    setForm(buildVesselForm());
    setIsModalOpen(true);
  }

  function handleEdit(row: VesselRow) {
    setEditingVessel(buildEditVessel(row));
    setForm(buildVesselForm(row));
    setIsModalOpen(true);
  }

  async function handleDelete(vesselId: string) {
    setDeletingId(vesselId);

    try {
      const response = await fetch(`/api/vessels/${vesselId}`, { method: "DELETE" });

      if (!response.ok) {
        const error = (await response.json()) as { message?: string };
        throw new Error(error.message ?? "Failed to delete vessel.");
      }

      toast({
        title: "Vessel deleted",
        description: "The vessel has been removed successfully.",
        variant: "success",
      });
      await loadVessels();
    } catch (error) {
      toast({
        title: "Delete failed",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);

    try {
      const method = editingVessel ? "PATCH" : "POST";
      const url = editingVessel ? `/api/vessels/${editingVessel.id}` : "/api/vessels";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const error = (await response.json()) as { message?: string };
        throw new Error(error.message ?? "Failed to save vessel.");
      }

      toast({
        title: editingVessel ? "Vessel updated" : "Vessel created",
        description: editingVessel
          ? "The vessel changes have been saved."
          : "A new vessel has been added.",
        variant: "success",
      });

      setIsModalOpen(false);
      setEditingVessel(null);
      setForm(buildVesselForm());
      await loadVessels();
    } catch (error) {
      toast({
        title: "Save failed",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleExport() {
    try {
      const response = await fetch("/api/vessels/export");
      if (!response.ok) throw new Error("Failed to export vessels.");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "vessels.csv";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Export failed",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  }

  async function handleDownloadTemplate() {
    try {
      const response = await fetch("/api/vessels/template");
      if (!response.ok) throw new Error("Failed to download template.");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "vessels-template.csv";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Download template failed",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  }

  async function handleImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedImportFile(file);
  }

  async function handleImportSubmit() {
    if (!selectedImportFile) {
      toast({
        title: "No file selected",
        description: "Please choose a CSV file first.",
        variant: "destructive",
      });
      return;
    }

    setImporting(true);
    const formData = new FormData();
    formData.append("file", selectedImportFile);

    try {
      const response = await fetch("/api/vessels/import", {
        method: "POST",
        body: formData,
      });

      const result = (await response.json()) as {
        imported?: number;
        updated?: number;
        total?: number;
        message?: string;
      };

      if (!response.ok) {
        throw new Error(result.message ?? "Failed to import vessels.");
      }

      toast({
        title: "Import completed",
        description: `${result.imported ?? 0} created, ${result.updated ?? 0} updated from ${result.total ?? 0} row(s).`,
        variant: "success",
      });

      setIsImportModalOpen(false);
      setSelectedImportFile(null);
      await loadVessels(page, pageSize, appliedFilters);
    } catch (error) {
      toast({
        title: "Import failed",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
      if (importInputRef.current) {
        importInputRef.current.value = "";
      }
    }
  }

  return (
    <DashboardShell title={pageTitle} description={pageDescription}>
      <DynamicPage
        columns={columns}
        rows={rows}
        primaryAction={{
          label: "Add Vessel",
          onClick: openCreateModal,
          icon: <HugeiconsIcon icon={Add01Icon} size={20} strokeWidth={1.8} />,
        }}
        secondaryActions={[
          {
            label: "Export",
            onClick: handleExport,
            icon: <HugeiconsIcon icon={Download01Icon} size={18} strokeWidth={1.8} />,
          },
          {
            label: "Import",
            onClick: () => setIsImportModalOpen(true),
            icon: <HugeiconsIcon icon={Upload01Icon} size={18} strokeWidth={1.8} />,
          },
        ]}
        filterFields={filterFields}
        filterValues={draftFilters}
        onFilterValuesChange={setDraftFilters}
        onApplyFilters={(values) => {
          setAppliedFilters(values);
          void loadVessels(1, pageSize, values);
        }}
        onResetFilters={() => {
          const cleared = {};
          setDraftFilters(cleared);
          setAppliedFilters(cleared);
          void loadVessels(1, pageSize, cleared);
        }}
        currentPage={page}
        totalPages={totalPages}
        totalRows={totalRows}
        currentPageSize={pageSize}
        onPageChange={(nextPage) => {
          void loadVessels(nextPage, pageSize, appliedFilters);
        }}
        onPageSizeChange={(nextPageSize) => {
          void loadVessels(1, nextPageSize, appliedFilters);
        }}
        serverSideFiltering
        serverSidePagination
        loading={loading}
        emptyRows={loading ? 6 : 4}
        pageSizeOptions={[10, 25, 50]}
        initialPageSize={pageSize}
        rowKey={(row) => row.id}
      />

      <input
        ref={importInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(event) => void handleImport(event)}
      />

      {isImportModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/18 p-4 backdrop-blur-[2px] dark:bg-[#020617]/55">
          <div className="w-full max-w-[560px] rounded-[22px] border border-[#e5e7eb] bg-white px-6 py-6 text-[#111827] shadow-[0_20px_48px_rgba(15,23,42,0.16)] dark:border-white/10 dark:bg-[#111827] dark:text-white dark:shadow-[0_20px_52px_rgba(2,6,23,0.55)]">
            <div className="flex items-start justify-between gap-6">
              <div>
                <h2 className="text-[18px] font-semibold tracking-[-0.03em] text-[#111827] dark:text-white">
                  Import Vessels
                </h2>
                <p className="mt-1 text-[14px] text-[#6b7280] dark:text-[#94a3b8]">
                  Download the template, fill your vessel data, then upload the CSV file.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setSelectedImportFile(null);
                }}
                aria-label="Close import modal"
                className="rounded-full p-1 text-[#6b7280] transition hover:text-[#111827] dark:text-[#94a3b8] dark:hover:text-white"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={20} strokeWidth={1.8} />
              </button>
            </div>

            <div className="mt-6 space-y-5">
              <div className="space-y-2.5">
                <Label className="text-[14px] font-medium text-[#374151] dark:text-[#d1d5db]">
                  Step 1
                </Label>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="flex h-[46px] w-full items-center justify-center gap-2 rounded-[14px] border border-[#d1d5db] bg-white px-4 text-[14px] font-medium text-[#111827] transition hover:bg-[#f8fafc] dark:border-white/10 dark:bg-[#151d2c] dark:text-white dark:hover:bg-white/8"
                >
                  <HugeiconsIcon icon={Download01Icon} size={18} strokeWidth={1.8} />
                  Download Template CSV
                </button>
              </div>

              <div className="space-y-2.5">
                <Label className="text-[14px] font-medium text-[#374151] dark:text-[#d1d5db]">
                  Step 2
                </Label>
                <button
                  type="button"
                  onClick={() => importInputRef.current?.click()}
                  className="flex h-[46px] w-full items-center justify-center gap-2 rounded-[14px] border border-[#d1d5db] bg-white px-4 text-[14px] font-medium text-[#111827] transition hover:bg-[#f8fafc] dark:border-white/10 dark:bg-[#151d2c] dark:text-white dark:hover:bg-white/8"
                >
                  <HugeiconsIcon icon={Upload01Icon} size={18} strokeWidth={1.8} />
                  {selectedImportFile ? "Change CSV File" : "Choose CSV File"}
                </button>
                <p className="text-[13px] text-[#94a3b8] dark:text-[#64748b]">
                  {selectedImportFile
                    ? `Selected file: ${selectedImportFile.name}`
                    : "No file selected yet."}
                </p>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-end gap-4">
              <button
                type="button"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setSelectedImportFile(null);
                }}
                className="text-[14px] font-medium text-[#6b7280] transition hover:text-[#111827] dark:text-[#94a3b8] dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleImportSubmit()}
                disabled={importing}
                className="rounded-[12px] bg-[#4438ff] px-5 py-2.5 text-[14px] font-medium text-white hover:bg-[#3c31ec] disabled:cursor-not-allowed disabled:opacity-70 dark:bg-[#5b61ff] dark:hover:bg-[#6970ff]"
              >
                {importing ? "Importing..." : "Import"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/18 p-4 backdrop-blur-[2px] dark:bg-[#020617]/55">
          <div className="w-full max-w-[560px] rounded-[22px] border border-[#e5e7eb] bg-white px-6 py-6 text-[#111827] shadow-[0_20px_48px_rgba(15,23,42,0.16)] dark:border-white/10 dark:bg-[#111827] dark:text-white dark:shadow-[0_20px_52px_rgba(2,6,23,0.55)]">
            <div className="mb-6">
              <h2 className="text-[18px] font-semibold tracking-[-0.03em] text-[#111827] dark:text-white">
                {editingVessel ? "Edit Vessel" : "Add Vessel"}
              </h2>
              <p className="mt-1 text-[14px] text-[#6b7280] dark:text-[#94a3b8]">
                Fill in the vessel details below.
              </p>
            </div>

            <form className="space-y-5" onSubmit={(event) => void handleSubmit(event)}>
              <div className="space-y-2.5">
                <Label className="text-[14px] font-medium text-[#374151] dark:text-[#d1d5db]">
                  Name
                </Label>
                <Input
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="Vessel name"
                  className="h-[46px] rounded-[14px] border-[#d1d5db] bg-white px-4 text-[14px] text-[#111827] placeholder:text-[#9ca3af] focus-visible:border-[#4438ff] focus-visible:ring-[color:rgba(68,56,255,0.12)] dark:border-white/10 dark:bg-[#151d2c] dark:text-white dark:placeholder:text-[#64748b]"
                  required
                />
              </div>

              <div className="space-y-2.5">
                <Label className="text-[14px] font-medium text-[#374151] dark:text-[#d1d5db]">
                  Type
                </Label>
                <select
                  value={form.type}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      type: event.target.value as VesselType,
                    }))
                  }
                  className="h-[46px] w-full rounded-[14px] border border-[#d1d5db] bg-white px-4 text-[14px] text-[#111827] outline-none focus:border-[#4438ff] dark:border-white/10 dark:bg-[#151d2c] dark:text-white"
                >
                  {vesselTypeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-8 flex items-center justify-end gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingVessel(null);
                    setForm(buildVesselForm());
                  }}
                  className="text-[14px] font-medium text-[#6b7280] transition hover:text-[#111827] dark:text-[#94a3b8] dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-[12px] bg-[#4438ff] px-5 py-2.5 text-[14px] font-medium text-white hover:bg-[#3c31ec] disabled:cursor-not-allowed disabled:opacity-70 dark:bg-[#5b61ff] dark:hover:bg-[#6970ff]"
                >
                  {submitting ? "Saving..." : editingVessel ? "Update" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </DashboardShell>
  );
}
