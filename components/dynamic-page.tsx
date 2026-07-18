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
  FilterHorizontalIcon,
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
  filterContent?: ReactNode;
  columnContent?: ReactNode;
  filterFields?: FilterField[];
  emptyRows?: number;
  pageSizeOptions?: number[];
  initialPageSize?: number;
  rowKey?: (row: T, index: number) => string;
};

export function DynamicPage<T>({
  columns,
  rows,
  primaryAction,
  filterContent,
  columnContent,
  filterFields = [],
  emptyRows = 4,
  pageSizeOptions = [10, 25, 50],
  initialPageSize = 10,
  rowKey,
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

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const visibleColumns = useMemo(
    () =>
      columns.filter((column) =>
        visibleColumnKeys.includes(String(column.key))
      ),
    [columns, visibleColumnKeys]
  );

  const visibleRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [pageSize, rows, safePage]);

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
        <div className="w-full sm:w-auto">
          {primaryAction ? (
            <Button
              onClick={primaryAction.onClick}
              className="h-[50px] w-full rounded-[16px] bg-[#4438ff] px-6 text-[14px] font-medium text-white hover:bg-[#3c31ec] dark:bg-[#5b61ff] dark:hover:bg-[#6970ff] sm:w-auto"
            >
              {primaryAction.icon ?? (
                <HugeiconsIcon icon={Upload01Icon} size={20} strokeWidth={1.8} />
              )}
              {primaryAction.label}
            </Button>
          ) : null}
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
          values={filterValues}
          content={filterContent}
          onClose={() => setIsFilterOpen(false)}
          onReset={() => setFilterValues({})}
          onChange={(key, value) =>
            setFilterValues((current) => ({
              ...current,
              [key]: value,
            }))
          }
          onApply={() => setIsFilterOpen(false)}
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
            : Array.from({ length: emptyRows }).map((_, index) => (
                <tr
                  key={`empty-${index}`}
                  className="h-[68px] border-b border-[#ededed] dark:border-white/10 last:border-b-0"
                >
                  {visibleColumns.map((column) => (
                    <td
                      key={String(column.key)}
                      className={`px-5 py-4 ${column.widthClassName ?? ""}`}
                    />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-4 border-t border-[#ededed] px-5 py-5 text-[#6f7482] dark:border-white/10 dark:text-[#94a3b8] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-full items-center justify-between gap-3 text-[14px] sm:w-auto sm:justify-start">
            <span>Row per page</span>
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
              className="h-[42px] rounded-[12px] border border-[#d8d8d8] bg-white px-3 text-[14px] text-[#1f2430] outline-none dark:border-white/10 dark:bg-[#151d2c] dark:text-white"
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
              onClick={() => setPage((current) => Math.max(1, current - 1))}
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
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
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
