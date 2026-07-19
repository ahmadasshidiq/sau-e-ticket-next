"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  ArrowDown01Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  FileEmpty02Icon,
  FilterHorizontalIcon,
  Loading03Icon,
  Upload01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type DataColumn<T> = {
  key: keyof T | string;
  title: string;
  widthClassName?: string;
  textClassName?: string;
  align?: "left" | "center" | "right";
  hideable?: boolean;
  defaultVisible?: boolean;
  formatter?: (
    value: unknown,
    row: T,
    index: number
  ) => ReactNode;
};

type ToolbarAction = {
  label: string;
  onClick?: () => void;
  icon?: ReactNode;
  variant?: "primary" | "secondary";
};

type FilterField = {
  key: string;
  label: string;
  placeholder?: string;
};

type DynamicPageProps<T> = {
  columns: DataColumn<T>[];
  rows: T[];
  primaryAction?: ToolbarAction;
  secondaryActions?: ToolbarAction[];
  filterContent?: ReactNode;
  columnContent?: ReactNode;
  filterFields?: FilterField[];
  emptyRows?: number;
  pageSizeOptions?: number[];
  initialPageSize?: number;
  rowKey?: (row: T, index: number) => string;
  currentPage?: number;
  totalPages?: number;
  totalRows?: number;
  currentPageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  filterValues?: Record<string, string>;
  onFilterValuesChange?: (values: Record<string, string>) => void;
  onApplyFilters?: (values: Record<string, string>) => void;
  onResetFilters?: () => void;
  serverSideFiltering?: boolean;
  serverSidePagination?: boolean;
  loading?: boolean;
};

export function DynamicPage<T>({
  columns,
  rows,
  primaryAction,
  secondaryActions = [],
  filterContent,
  columnContent,
  filterFields = [],
  emptyRows = 4,
  pageSizeOptions = [10, 25, 50],
  initialPageSize = 10,
  rowKey,
  currentPage,
  totalPages: controlledTotalPages,
  totalRows,
  currentPageSize,
  onPageChange,
  onPageSizeChange,
  filterValues: controlledFilterValues,
  onFilterValuesChange,
  onApplyFilters,
  onResetFilters,
  serverSideFiltering = false,
  serverSidePagination = false,
  loading = false,
}: DynamicPageProps<T>) {
  const columnTriggerRef = useRef<HTMLDivElement | null>(null);
  const columnDropdownRef = useRef<HTMLDivElement | null>(null);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [page, setPage] = useState(1);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isColumnOpen, setIsColumnOpen] = useState(false);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<string[]>(
    columns
      .filter((column) => column.defaultVisible !== false)
      .map((column) => String(column.key))
  );

  const effectiveFilterValues = controlledFilterValues ?? filterValues;
  const effectivePageSize = currentPageSize ?? pageSize;

  const filteredRows = useMemo(() => {
    if (serverSideFiltering) {
      return rows;
    }

    const activeFilters = Object.entries(filterValues).filter(([, value]) =>
      value.trim()
    );

    if (activeFilters.length === 0) {
      return rows;
    }

    return rows.filter((row) =>
      activeFilters.every(([key, value]) => {
        const source = (row as Record<string, unknown>)[key];
        return String(source ?? "")
          .toLowerCase()
          .includes(value.toLowerCase());
      })
    );
  }, [filterValues, rows, serverSideFiltering]);

  const computedTotalPages = Math.max(
    1,
    Math.ceil(filteredRows.length / effectivePageSize)
  );
  const totalPages = controlledTotalPages ?? computedTotalPages;
  const effectivePage = currentPage ?? page;
  const safePage = Math.min(effectivePage, totalPages);
  const visibleColumns = useMemo(
    () =>
      columns.filter((column) =>
        visibleColumnKeys.includes(String(column.key))
      ),
    [columns, visibleColumnKeys]
  );

  const visibleRows = useMemo(() => {
    if (serverSidePagination) {
      return rows;
    }

    const start = (safePage - 1) * effectivePageSize;
    return filteredRows.slice(start, start + effectivePageSize);
  }, [effectivePageSize, filteredRows, rows, safePage, serverSidePagination]);

  useEffect(() => {
    if (!isColumnOpen) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      const clickedTrigger = columnTriggerRef.current?.contains(target);
      const clickedDropdown = columnDropdownRef.current?.contains(target);

      if (!clickedTrigger && !clickedDropdown) {
        setIsColumnOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsColumnOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isColumnOpen]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid w-full grid-cols-2 gap-3 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
          {primaryAction ? (
            <ToolbarActionButton action={primaryAction} primary />
          ) : null}
          {secondaryActions.map((action) => (
            <ToolbarActionButton
              key={action.label}
              action={action}
              halfOnMobile
            />
          ))}
        </div>

        <div className="relative flex w-full flex-wrap items-center gap-3 sm:w-auto">
          <div className="flex w-full gap-3 sm:w-auto">
            <ToolbarMenuButton
              label="Filters"
              icon={<HugeiconsIcon icon={FilterHorizontalIcon} size={18} strokeWidth={1.8} />}
              content={filterContent}
              onClick={() => setIsFilterOpen(true)}
              className="flex-1 sm:flex-none"
            />
            <div ref={columnTriggerRef} className="flex-1 sm:flex-none">
              <ToolbarMenuButton
                label="Column"
                icon={<HugeiconsIcon icon={ArrowDown01Icon} size={18} strokeWidth={1.8} />}
                content={columnContent}
                iconTrailing
                onClick={() => setIsColumnOpen((current) => !current)}
                className="w-full sm:w-auto"
              />
            </div>
          </div>
        </div>
      </div>

      {isFilterOpen ? (
        <FilterModal
          fields={filterFields}
          values={effectiveFilterValues}
          content={filterContent}
          onClose={() => setIsFilterOpen(false)}
          onReset={() => {
            if (onFilterValuesChange) {
              onFilterValuesChange({});
            } else {
              setFilterValues({});
            }

            if (onResetFilters) {
              onResetFilters();
            }
          }}
          onChange={(key, value) =>
            onFilterValuesChange
              ? onFilterValuesChange({
                  ...effectiveFilterValues,
                  [key]: value,
                })
              : setFilterValues((current) => ({
                  ...current,
                  [key]: value,
                }))
          }
          onApply={() => {
            onApplyFilters?.(effectiveFilterValues);
            setIsFilterOpen(false);
          }}
        />
      ) : null}

      <div className="relative overflow-hidden rounded-[22px] border border-[#d8d8d8] bg-white transition-colors dark:border-white/10 dark:bg-[#111827]">
        {isColumnOpen ? (
          <div
            ref={columnDropdownRef}
            className="absolute top-[5px] right-[5px] z-40"
          >
            <ColumnVisibilityMenu
              columns={columns}
              visibleColumnKeys={visibleColumnKeys}
              content={columnContent}
              onToggle={(key) =>
                setVisibleColumnKeys((current) => {
                  const isVisible = current.includes(key);
                  const targetColumn = columns.find(
                    (column) => String(column.key) === key
                  );
                  const nextVisibleCount = isVisible
                    ? current.length - 1
                    : current.length + 1;

                  if (
                    isVisible &&
                    nextVisibleCount === 0 &&
                    targetColumn?.hideable !== false
                  ) {
                    return current;
                  }

                  return isVisible
                    ? current.filter((item) => item !== key)
                    : [...current, key];
                })
              }
            />
          </div>
        ) : null}
        {loading ? (
          <div className="absolute inset-x-0 top-[57px] bottom-[74px] z-10 flex items-center justify-center bg-white/72 backdrop-blur-[1px] dark:bg-[#111827]/72">
            <div className="flex flex-col items-center gap-3 text-center">
              <HugeiconsIcon
                icon={Loading03Icon}
                size={30}
                strokeWidth={1.8}
                className="animate-spin text-[#4438ff] dark:text-[#6970ff]"
              />
              <p className="text-[14px] font-medium text-[#6b7280] dark:text-[#94a3b8]">
                Loading data...
              </p>
            </div>
          </div>
        ) : null}
        <div className="overflow-x-auto">
          <table className="min-w-[980px] border-collapse md:w-full md:min-w-0 md:table-fixed">
            <thead>
              <tr className="border-b border-[#e8e8e8] bg-[#fafafa] dark:border-white/10 dark:bg-[#151d2c]">
                {visibleColumns.map((column) => (
                  <th
                    key={String(column.key)}
                    className={`whitespace-nowrap px-5 py-4 text-[14px] font-medium text-[#8f94a3] dark:text-[#94a3b8] ${column.widthClassName ?? ""} ${alignClassName(column.align)}`}
                  >
                    {column.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
          {visibleRows.length > 0
            ? visibleRows.map((row, index) => (
                <tr
                  key={rowKey ? rowKey(row, index) : `${index}`}
                  className="min-h-[68px] border-b border-[#ededed] dark:border-white/10 last:border-b-0"
                >
                  {visibleColumns.map((column) => (
                    <td
                      key={String(column.key)}
                      className={`whitespace-nowrap px-5 py-4 text-[14px] text-[#535862] dark:text-[#d1d5db] ${column.textClassName ?? ""} ${column.widthClassName ?? ""} ${alignClassName(column.align)}`}
                    >
                      {column.formatter
                        ? column.formatter(
                            (row as Record<string, unknown>)[String(column.key)],
                            row,
                            index
                          )
                        : String((row as Record<string, unknown>)[String(column.key)] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            : (
                <tr>
                  <td
                    colSpan={Math.max(visibleColumns.length, 1)}
                    className="px-5 py-16"
                  >
                    <div className="flex flex-col items-center justify-center gap-3 text-center">
                      <div className="flex size-14 items-center justify-center rounded-full bg-[#f3f4f6] text-[#94a3b8] dark:bg-white/5 dark:text-[#64748b]">
                        <HugeiconsIcon
                          icon={FileEmpty02Icon}
                          size={26}
                          strokeWidth={1.8}
                        />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[16px] font-semibold text-[#374151] dark:text-[#e5e7eb]">
                          No Data
                        </p>
                        <p className="text-[13px] text-[#94a3b8] dark:text-[#64748b]">
                          There is no data to display yet.
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-4 border-t border-[#ededed] px-5 py-5 text-[#6f7482] dark:border-white/10 dark:text-[#94a3b8] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-full items-center justify-between gap-3 text-[14px] sm:w-auto sm:justify-start">
            <span className="whitespace-nowrap">Row per page</span>
            <select
              value={effectivePageSize}
              onChange={(event) => {
                const nextPageSize = Number(event.target.value);

                if (onPageSizeChange) {
                  onPageSizeChange(nextPageSize);
                } else {
                  setPageSize(nextPageSize);
                  setPage(1);
                }
              }}
              className="h-[42px] min-w-[84px] rounded-[12px] border border-[#d8d8d8] bg-white px-3 text-[14px] text-[#1f2430] outline-none dark:border-white/10 dark:bg-[#151d2c] dark:text-white"
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="flex w-full items-center justify-between gap-3 text-[14px] sm:min-w-[260px] sm:justify-end">
            <Button
              variant="outline"
              className="h-[40px] min-w-[72px] rounded-[12px] border-[#d8d8d8] px-4 text-[#4b5160] dark:border-white/10 dark:bg-[#151d2c] dark:text-[#d1d5db]"
              onClick={() => {
                const nextPage = Math.max(1, safePage - 1);
                if (onPageChange) {
                  onPageChange(nextPage);
                } else {
                  setPage(nextPage);
                }
              }}
              disabled={safePage <= 1}
            >
              Prev
            </Button>
            <span className="min-w-[64px] flex-1 text-center text-[#6f7482] dark:text-[#94a3b8] sm:min-w-[90px] sm:flex-none">
              {safePage} / {totalPages}
            </span>
            <Button
              variant="outline"
              className="h-[40px] min-w-[72px] rounded-[12px] border-[#d8d8d8] px-4 text-[#4b5160] dark:border-white/10 dark:bg-[#151d2c] dark:text-[#d1d5db]"
              onClick={() => {
                const nextPage = Math.min(totalPages, safePage + 1);
                if (onPageChange) {
                  onPageChange(nextPage);
                } else {
                  setPage(nextPage);
                }
              }}
              disabled={safePage >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolbarActionButton({
  action,
  primary = false,
  halfOnMobile = false,
}: {
  action: ToolbarAction;
  primary?: boolean;
  halfOnMobile?: boolean;
}) {
  if (primary) {
    return (
      <Button
        onClick={action.onClick}
        className="col-span-2 h-[50px] w-full rounded-[16px] bg-[#4438ff] px-6 text-[14px] font-medium text-white hover:bg-[#3c31ec] dark:bg-[#5b61ff] dark:hover:bg-[#6970ff] sm:w-auto"
      >
        {action.icon ?? (
          <HugeiconsIcon icon={Upload01Icon} size={20} strokeWidth={1.8} />
        )}
        {action.label}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={action.onClick}
      className={`h-[50px] rounded-[16px] border-[#d8d8d8] bg-white px-5 text-[14px] font-medium text-[#111827] dark:border-white/10 dark:bg-[#111827] dark:text-white ${halfOnMobile ? "w-full sm:w-auto" : "w-full sm:w-auto"}`}
    >
      {action.icon}
      {action.label}
    </Button>
  );
}

function ToolbarMenuButton({
  label,
  icon,
  content,
  iconTrailing = false,
  onClick,
  className = "",
}: {
  label: string;
  icon: ReactNode;
  content?: ReactNode;
  iconTrailing?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-center gap-2 rounded-[16px] border border-[#d8d8d8] bg-white px-5 py-3 text-[14px] font-medium text-sm text-[#111827] transition dark:border-white/10 dark:bg-[#111827] dark:text-white sm:w-auto ${className}`}
    >
      {iconTrailing ? null : icon}
      <span>{label}</span>
      {iconTrailing ? icon : null}
      {content ? <div className="hidden">{content}</div> : null}
    </button>
  );
}

function ColumnVisibilityMenu<T>({
  columns,
  visibleColumnKeys,
  content,
  onToggle,
}: {
  columns: DataColumn<T>[];
  visibleColumnKeys: string[];
  content?: ReactNode;
  onToggle: (key: string) => void;
}) {
  return (
    <div className="w-[220px] rounded-[16px] border border-[#e5e7eb] bg-white p-2.5 text-[#111827] shadow-[0_16px_40px_rgba(15,23,42,0.14)] dark:border-white/10 dark:bg-[#111827] dark:text-white dark:shadow-[0_20px_44px_rgba(2,6,23,0.45)]">
      <div className="space-y-1">
        {columns.map((column) => {
          const key = String(column.key);
          const checked = visibleColumnKeys.includes(key);

          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                if (column.hideable === false) return;
                onToggle(key);
              }}
              className="flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left text-[14px] text-[#111827] transition hover:bg-[#f3f4f6] dark:text-white dark:hover:bg-white/8"
            >
              <span className="flex size-5 items-center justify-center">
                {checked ? (
                  <HugeiconsIcon
                    icon={CheckmarkCircle02Icon}
                    size={16}
                    strokeWidth={2}
                  />
                ) : <span className="size-3.5 rounded-[4px] border border-[#cbd5e1] dark:border-white/20" />}
              </span>
              <span className="truncate">{column.title}</span>
            </button>
          );
        })}
      </div>
      {content ? <div className="hidden">{content}</div> : null}
    </div>
  );
}

function FilterModal({
  fields,
  values,
  content,
  onClose,
  onReset,
  onApply,
  onChange,
}: {
  fields: FilterField[];
  values: Record<string, string>;
  content?: ReactNode;
  onClose: () => void;
  onReset: () => void;
  onApply: () => void;
  onChange: (key: string, value: string) => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/18 p-4 backdrop-blur-[2px] dark:bg-[#020617]/55">
      <div className="w-full max-w-[560px] rounded-[22px] border border-[#e5e7eb] bg-white px-6 py-6 text-[#111827] shadow-[0_20px_48px_rgba(15,23,42,0.16)] dark:border-white/10 dark:bg-[#111827] dark:text-white dark:shadow-[0_20px_52px_rgba(2,6,23,0.55)]">
        <div className="flex items-start justify-between gap-6">
          <h2 className="text-[18px] font-semibold tracking-[-0.03em] text-[#111827] dark:text-white">
            Filter Data
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filter modal"
            className="rounded-full p-1 text-[#6b7280] transition hover:text-[#111827] dark:text-[#94a3b8] dark:hover:text-white"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={20} strokeWidth={1.8} />
          </button>
        </div>

        <div className="mt-6 space-y-5">
          {fields.map((field) => (
            <div key={field.key} className="space-y-2.5">
              <Label className="text-[14px] font-medium text-[#374151] dark:text-[#d1d5db]">
                {field.label}
              </Label>
              <Input
                value={values[field.key] ?? ""}
                onChange={(event) => onChange(field.key, event.target.value)}
                placeholder={field.placeholder}
                className="h-[46px] rounded-[14px] border-[#d1d5db] bg-white px-4 text-[14px] text-[#111827] placeholder:text-[#9ca3af] focus-visible:border-[#4438ff] focus-visible:ring-[color:rgba(68,56,255,0.12)] dark:border-white/10 dark:bg-[#151d2c] dark:text-white dark:placeholder:text-[#64748b]"
              />
            </div>
          ))}
          {content ? <div className="hidden">{content}</div> : null}
        </div>

        <div className="mt-8 flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={onReset}
            className="text-[14px] font-medium text-[#6b7280] transition hover:text-[#111827] dark:text-[#94a3b8] dark:hover:text-white"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onApply}
            className="rounded-[12px] bg-[#4438ff] px-5 py-2.5 text-[14px] font-medium text-white hover:bg-[#3c31ec] dark:bg-[#5b61ff] dark:hover:bg-[#6970ff]"
          >
            Apply Filter
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function alignClassName(align?: "left" | "center" | "right") {
  if (align === "center") return "text-center";
  if (align === "right") return "text-right";
  return "text-left";
}

export type { DataColumn, DynamicPageProps, FilterField, ToolbarAction };
