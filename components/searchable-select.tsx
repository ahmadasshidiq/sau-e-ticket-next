"use client";

import { useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type SearchableSelectOption = {
  id: string;
  label: string;
  meta?: string | null;
};

type SearchableSelectProps = {
  label: string;
  value: string;
  selectedId: string | null;
  loading: boolean;
  open: boolean;
  options: SearchableSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  fieldClassName?: string;
  onOpen: () => void;
  onClose: () => void;
  onChange: (value: string) => void;
  onSelect: (option: SearchableSelectOption) => void;
  loadingText?: string;
  emptyText?: string;
};

const defaultFieldClassName =
  "h-[46px] rounded-[14px] border-[#d1d5db] bg-white px-4 text-[14px] text-[#111827] placeholder:text-[#9ca3af] focus-visible:border-[#4438ff] focus-visible:ring-[color:rgba(68,56,255,0.12)] dark:border-white/10 dark:bg-[#151d2c] dark:text-white dark:placeholder:text-[#64748b]";

export function SearchableSelect({
  label,
  value,
  selectedId,
  loading,
  open,
  options,
  placeholder = "Search",
  disabled = false,
  fieldClassName = defaultFieldClassName,
  onOpen,
  onClose,
  onChange,
  onSelect,
  loadingText = "Loading...",
  emptyText = "No data found.",
}: SearchableSelectProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;

      if (!containerRef.current?.contains(target)) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [onClose]);

  return (
    <div ref={containerRef} className="space-y-2.5">
      <Label className="text-[14px] font-medium text-[#374151] dark:text-[#d1d5db]">
        {label}
      </Label>
      <div className="relative">
        <Input
          type="text"
          value={value}
          onFocus={onOpen}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          className={fieldClassName}
        />
        {open && !disabled ? (
          <div className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-[14px] border border-[#d1d5db] bg-white p-2 shadow-[0_16px_40px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-[#111827]">
            {loading ? (
              <div className="px-3 py-3 text-sm text-[#6b7280] dark:text-[#94a3b8]">
                {loadingText}
              </div>
            ) : options.length > 0 ? (
              <div className="space-y-1">
                {options.map((option) => {
                  const isSelected = option.id === selectedId;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => onSelect(option)}
                      className={`flex w-full items-center justify-between rounded-[12px] px-3 py-2 text-left text-sm transition ${
                        isSelected
                          ? "bg-[#eef2ff] text-[#312e81] dark:bg-[#1e1b4b] dark:text-[#c7d2fe]"
                          : "text-[#111827] hover:bg-[#f8fafc] dark:text-white dark:hover:bg-[#151d2c]"
                      }`}
                    >
                      <span>{option.label}</span>
                      {option.meta ? (
                        <span className="text-[10px] text-[#94a3b8]">{option.meta}</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="px-3 py-3 text-sm text-[#6b7280] dark:text-[#94a3b8]">
                {emptyText}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
