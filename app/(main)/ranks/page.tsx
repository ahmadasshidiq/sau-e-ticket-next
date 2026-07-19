"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Cancel01Icon,
  Delete02Icon,
  Download01Icon,
  PencilEdit02Icon,
  Upload01Icon,
  Add01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { DashboardShell } from "@/components/dashboard-shell";
import { DynamicPage } from "@/components/dynamic-page";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/lib/toast";
import {
  buildEditRank,
  buildRankForm,
  buildRanksSearchParams,
  defaultRankForm,
  filterFields,
  getRankColumns,
  mapRanksToRows,
  pageDescription,
  pageTitle,
  type RankApiRow,
  type RankFormState,
  type RankRow,
  type RanksResponse,
} from "./page.config";

export default function RanksPage() {
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [ranks, setRanks] = useState<RankApiRow[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingRank, setEditingRank] = useState<RankApiRow | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedImportFile, setSelectedImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [form, setForm] = useState<RankFormState>(defaultRankForm);
  const [draftFilters, setDraftFilters] = useState<Record<string, string>>({});
  const [appliedFilters, setAppliedFilters] = useState<Record<string, string>>({});

  async function loadRanks(
    nextPage = page,
    nextPageSize = pageSize,
    filters = appliedFilters
  ) {
    setLoading(true);

    try {
      const searchParams = buildRanksSearchParams(nextPage, nextPageSize, filters);
      const response = await fetch(`/api/ranks?${searchParams.toString()}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to load ranks.");
      }

      const result = (await response.json()) as RanksResponse;
      setRanks(result.data);
      setPage(result.meta.page);
      setPageSize(result.meta.pageSize);
      setTotalPages(result.meta.totalPages);
      setTotalRows(result.meta.total);
    } catch (error) {
      toast({
        title: "Failed to load ranks",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRanks();
  }, []);

  const rows = useMemo<RankRow[]>(
    () => mapRanksToRows(ranks, (page - 1) * pageSize),
    [page, pageSize, ranks]
  );

  const columns = useMemo(
    () =>
      getRankColumns((row) => (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => handleEdit(row)}
            aria-label="Edit rank"
            title="Edit rank"
            className="rounded-[10px] p-2 text-[#64748b] transition hover:bg-[#f8fafc] hover:text-[#334155] dark:text-[#94a3b8] dark:hover:bg-white/8 dark:hover:text-white"
          >
            <HugeiconsIcon icon={PencilEdit02Icon} size={18} strokeWidth={1.8} />
          </button>
          <button
            type="button"
            onClick={() => void handleDelete(row.id)}
            disabled={deletingId === row.id}
            aria-label="Delete rank"
            title="Delete rank"
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
    setEditingRank(null);
    setForm(buildRankForm());
    setIsModalOpen(true);
  }

  function handleEdit(row: RankRow) {
    setEditingRank(buildEditRank(row));
    setForm(buildRankForm(row));
    setIsModalOpen(true);
  }

  async function handleDelete(rankId: string) {
    setDeletingId(rankId);

    try {
      const response = await fetch(`/api/ranks/${rankId}`, { method: "DELETE" });

      if (!response.ok) {
        const error = (await response.json()) as { message?: string };
        throw new Error(error.message ?? "Failed to delete rank.");
      }

      toast({
        title: "Rank deleted",
        description: "The rank has been removed successfully.",
        variant: "success",
      });
      await loadRanks();
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
      const method = editingRank ? "PATCH" : "POST";
      const url = editingRank ? `/api/ranks/${editingRank.id}` : "/api/ranks";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const error = (await response.json()) as { message?: string };
        throw new Error(error.message ?? "Failed to save rank.");
      }

      toast({
        title: editingRank ? "Rank updated" : "Rank created",
        description: editingRank
          ? "The rank changes have been saved."
          : "A new rank has been added.",
        variant: "success",
      });

      setIsModalOpen(false);
      setEditingRank(null);
      setForm(buildRankForm());
      await loadRanks();
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
      const response = await fetch("/api/ranks/export");
      if (!response.ok) throw new Error("Failed to export ranks.");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "ranks.csv";
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
      const response = await fetch("/api/ranks/template");
      if (!response.ok) throw new Error("Failed to download template.");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "ranks-template.csv";
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
      const response = await fetch("/api/ranks/import", {
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
        throw new Error(result.message ?? "Failed to import ranks.");
      }

      toast({
        title: "Import completed",
        description: `${result.imported ?? 0} created, ${result.updated ?? 0} updated from ${result.total ?? 0} row(s).`,
        variant: "success",
      });

      setIsImportModalOpen(false);
      setSelectedImportFile(null);
      await loadRanks(page, pageSize, appliedFilters);
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
          label: "Add Rank",
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
          void loadRanks(1, pageSize, values);
        }}
        onResetFilters={() => {
          const cleared = {};
          setDraftFilters(cleared);
          setAppliedFilters(cleared);
          void loadRanks(1, pageSize, cleared);
        }}
        currentPage={page}
        totalPages={totalPages}
        totalRows={totalRows}
        currentPageSize={pageSize}
        onPageChange={(nextPage) => {
          void loadRanks(nextPage, pageSize, appliedFilters);
        }}
        onPageSizeChange={(nextPageSize) => {
          void loadRanks(1, nextPageSize, appliedFilters);
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
                  Import Ranks
                </h2>
                <p className="mt-1 text-[14px] text-[#6b7280] dark:text-[#94a3b8]">
                  Download the template, fill your rank data, then upload the CSV file.
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
                <Label
                  htmlFor="rank-import-file"
                  className="text-[14px] font-medium text-[#374151] dark:text-[#d1d5db]"
                >
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

            <div className="mt-8 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setSelectedImportFile(null);
                }}
                className="flex h-[42px] items-center justify-center rounded-[14px] border border-transparent px-4 text-[14px] font-medium text-[#64748b] transition hover:bg-[#f8fafc] dark:text-[#94a3b8] dark:hover:bg-white/8"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleImportSubmit()}
                disabled={importing}
                className="flex h-[42px] items-center justify-center rounded-[14px] bg-[#6366f1] px-5 text-[14px] font-semibold text-white transition hover:bg-[#5855eb] disabled:cursor-not-allowed disabled:opacity-60"
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
            <div className="flex items-start justify-between gap-6">
              <div>
                <h2 className="text-[18px] font-semibold tracking-[-0.03em] text-[#111827] dark:text-white">
                  {editingRank ? "Update Rank" : "Add Rank"}
                </h2>
                <p className="mt-1 text-[14px] text-[#6b7280] dark:text-[#94a3b8]">
                  Fill in the rank details below.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingRank(null);
                }}
                aria-label="Close rank form"
                className="rounded-full p-1 text-[#6b7280] transition hover:text-[#111827] dark:text-[#94a3b8] dark:hover:text-white"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={20} strokeWidth={1.8} />
              </button>
            </div>

            <form className="mt-6 space-y-5" onSubmit={(event) => void handleSubmit(event)}>
              <div className="space-y-2.5">
                <Label
                  htmlFor="rank-name"
                  className="text-[14px] font-medium text-[#374151] dark:text-[#d1d5db]"
                >
                  Name
                </Label>
                <Input
                  id="rank-name"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Rank name"
                  className="h-[56px] rounded-[16px] border-[#d1d5db] bg-white px-5 text-[15px] text-[#111827] placeholder:text-[#94a3b8] focus-visible:ring-2 focus-visible:ring-[#6366f1]/30 dark:border-white/10 dark:bg-[#151d2c] dark:text-white dark:placeholder:text-[#64748b]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingRank(null);
                  }}
                  className="flex h-[42px] items-center justify-center rounded-[14px] border border-transparent px-4 text-[14px] font-medium text-[#64748b] transition hover:bg-[#f8fafc] dark:text-[#94a3b8] dark:hover:bg-white/8"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex h-[42px] items-center justify-center rounded-[14px] bg-[#6366f1] px-5 text-[14px] font-semibold text-white transition hover:bg-[#5855eb] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Saving..." : editingRank ? "Update Rank" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </DashboardShell>
  );
}
