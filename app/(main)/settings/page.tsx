"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/lib/toast";
import {
  buildSettingsForm,
  defaultSettingsForm,
  pageDescription,
  pageTitle,
  type SettingsFormState,
  type SettingsResponse,
} from "./page.config";

export default function SettingsPage() {
  const router = useRouter();
  const [form, setForm] = useState<SettingsFormState>(defaultSettingsForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<
    "logoWhite" | "logoColored" | "favicon" | null
  >(null);

  useEffect(() => {
    async function loadSettings() {
      setLoading(true);

      try {
        const response = await fetch("/api/settings", { cache: "no-store" });

        if (!response.ok) {
          throw new Error("Failed to load settings.");
        }

        const result = (await response.json()) as SettingsResponse;
        setForm(buildSettingsForm(result));
      } catch (error) {
        toast({
          title: "Failed to load settings",
          description:
            error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    void loadSettings();
  }, []);

  const previewLogoWhite = useMemo(() => form.logoWhite.trim(), [form.logoWhite]);
  const previewLogoColored = useMemo(
    () => form.logoColored.trim(),
    [form.logoColored]
  );
  const previewFavicon = useMemo(() => form.favicon.trim(), [form.favicon]);

  async function handleAssetUpload(
    field: "logoWhite" | "logoColored" | "favicon",
    file: File | null
  ) {
    if (!file) return;

    setUploadingField(field);

    try {
      const formData = new FormData();
      formData.append("field", field);
      formData.append("file", file);

      const response = await fetch("/api/settings/upload", {
        method: "POST",
        body: formData,
      });

      const result = (await response.json()) as {
        url?: string;
        message?: string;
      };

      if (!response.ok || !result.url) {
        throw new Error(result.message ?? "Failed to upload image.");
      }

      setForm((current) => ({
        ...current,
        [field]: result.url,
      }));

      toast({
        title: "Upload completed",
        description: "Asset uploaded successfully.",
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingField(null);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const result = (await response.json()) as {
        message?: string;
      } & SettingsResponse;

      if (!response.ok) {
        throw new Error(result.message ?? "Failed to save settings.");
      }

      setForm(buildSettingsForm(result));

      if (typeof document !== "undefined") {
        document.title = result.applicationName;

        if (result.favicon) {
          let link = document.querySelector("link[rel='icon']") as
            | HTMLLinkElement
            | null;

          if (!link) {
            link = document.createElement("link");
            link.rel = "icon";
            document.head.appendChild(link);
          }

          link.href = result.favicon;
        }
      }

      router.refresh();
      toast({
        title: "Settings updated",
        description: "Application branding has been updated successfully.",
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Save failed",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardShell title={pageTitle} description={pageDescription}>
      <div className="min-w-0 w-full max-w-[1320px] overflow-x-hidden">
        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="min-w-0 overflow-hidden rounded-[28px] border border-[#e5e7eb] bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-[#111827] dark:shadow-[0_20px_44px_rgba(2,6,23,0.38)] sm:p-7"
        >
          <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.35fr)_380px]">
            <div className="min-w-0 space-y-5">
              <div className="space-y-2.5">
                <Label className="text-[14px] font-medium text-[#374151] dark:text-[#d1d5db]">
                  Application Name
                </Label>
                <Input
                  value={form.applicationName}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      applicationName: event.target.value,
                    }))
                  }
                  placeholder="Application name"
                  disabled={loading || saving}
                  className="h-[56px] rounded-[16px] border-[#d1d5db] bg-white px-5 text-[15px] text-[#111827] placeholder:text-[#94a3b8] focus-visible:ring-2 focus-visible:ring-[#6366f1]/30 dark:border-white/10 dark:bg-[#151d2c] dark:text-white dark:placeholder:text-[#64748b]"
                />
              </div>

              <div className="space-y-2.5">
                <Label className="text-[14px] font-medium text-[#374151] dark:text-[#d1d5db]">
                  Company Name
                </Label>
                <Input
                  value={form.companyName}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      companyName: event.target.value,
                    }))
                  }
                  placeholder="Company name"
                  disabled={loading || saving}
                  className="h-[56px] rounded-[16px] border-[#d1d5db] bg-white px-5 text-[15px] text-[#111827] placeholder:text-[#94a3b8] focus-visible:ring-2 focus-visible:ring-[#6366f1]/30 dark:border-white/10 dark:bg-[#151d2c] dark:text-white dark:placeholder:text-[#64748b]"
                />
              </div>

              <AssetUploadField
                label="White Logo"
                value={form.logoWhite}
                busy={uploadingField === "logoWhite"}
                disabled={loading || saving}
                onClear={() =>
                  setForm((current) => ({
                    ...current,
                    logoWhite: "",
                  }))
                }
                onFileChange={(file) => void handleAssetUpload("logoWhite", file)}
              />

              <AssetUploadField
                label="Colored Logo"
                value={form.logoColored}
                busy={uploadingField === "logoColored"}
                disabled={loading || saving}
                onClear={() =>
                  setForm((current) => ({
                    ...current,
                    logoColored: "",
                  }))
                }
                onFileChange={(file) => void handleAssetUpload("logoColored", file)}
              />

              <AssetUploadField
                label="Favicon"
                value={form.favicon}
                busy={uploadingField === "favicon"}
                disabled={loading || saving}
                onClear={() =>
                  setForm((current) => ({
                    ...current,
                    favicon: "",
                  }))
                }
                onFileChange={(file) => void handleAssetUpload("favicon", file)}
              />
            </div>

            <div className="min-w-0 rounded-[22px] border border-[#e5e7eb] bg-[#f8fafc] p-5 dark:border-white/10 dark:bg-[#0f172a] xl:sticky xl:top-0">
              <h2 className="text-[16px] font-semibold text-[#111827] dark:text-white">
                Live Preview
              </h2>
              <p className="mt-1 text-[13px] text-[#64748b] dark:text-[#94a3b8]">
                Branding preview from the current form values.
              </p>

              <div className="mt-5 rounded-[20px] border border-[#dbe3f0] bg-white p-5 dark:border-white/10 dark:bg-[#111827]">
                <div className="flex items-center gap-4">
                  <div className="flex size-16 items-center justify-center overflow-hidden rounded-[18px] border border-[#dbe3f0] bg-[#eef2ff] dark:border-white/10 dark:bg-[#151d2c]">
                    {previewLogoColored ? (
                      <img
                        src={previewLogoColored}
                        alt="Colored logo preview"
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <span className="text-[12px] font-semibold text-[#6366f1] dark:text-[#a5b4fc]">
                        LOGO
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[18px] font-semibold text-[#111827] dark:text-white">
                      {form.applicationName || "Application Name"}
                    </p>
                    <p className="mt-1 truncate text-[13px] text-[#64748b] dark:text-[#94a3b8]">
                      {form.companyName || "Company Name"}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center overflow-hidden rounded-[12px] border border-[#dbe3f0] bg-[#1e293b] dark:border-white/10 dark:bg-[#0b1120]">
                    {previewLogoWhite ? (
                      <img
                        src={previewLogoWhite}
                        alt="White logo preview"
                        className="h-5 w-5 object-contain"
                      />
                    ) : (
                      <span className="text-[10px] font-semibold text-white">
                        W
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] text-[#64748b] dark:text-[#94a3b8]">
                    White logo preview
                  </p>
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center overflow-hidden rounded-[12px] border border-[#dbe3f0] bg-white dark:border-white/10 dark:bg-[#151d2c]">
                    {previewFavicon ? (
                      <img
                        src={previewFavicon}
                        alt="Favicon preview"
                        className="h-5 w-5 object-contain"
                      />
                    ) : (
                      <span className="text-[10px] font-semibold text-[#94a3b8]">
                        ICO
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] text-[#64748b] dark:text-[#94a3b8]">
                    Favicon preview
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-7 flex items-center justify-end gap-3">
            <button
              type="submit"
              disabled={loading || saving}
              className="flex h-[44px] w-full items-center justify-center rounded-[14px] bg-[#6366f1] px-5 text-[14px] font-semibold text-white transition hover:bg-[#5855eb] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </form>
      </div>
    </DashboardShell>
  );
}

function AssetUploadField({
  label,
  value,
  busy,
  disabled,
  onFileChange,
  onClear,
}: {
  label: string;
  value: string;
  busy: boolean;
  disabled: boolean;
  onFileChange: (file: File | null) => void;
  onClear: () => void;
}) {
  return (
    <div className="space-y-2.5">
      <Label className="text-[14px] font-medium text-[#374151] dark:text-[#d1d5db]">
        {label}
      </Label>
      <label className="flex min-h-[56px] w-full min-w-0 cursor-pointer flex-col items-start gap-3 overflow-hidden rounded-[16px] border border-[#d1d5db] bg-white px-4 py-3 transition hover:bg-[#f8fafc] dark:border-white/10 dark:bg-[#151d2c] dark:hover:bg-white/8 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 w-full overflow-hidden">
          <p className="block max-w-full truncate text-[14px] font-medium text-[#111827] dark:text-white">
            {busy ? "Uploading..." : value ? "Change image" : "Upload image"}
          </p>
          <p className="mt-1 block max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-[12px] text-[#94a3b8] dark:text-[#64748b]">
            {value || "PNG, JPG, WEBP, SVG, ICO up to 2 MB"}
          </p>
        </div>
        <input
          type="file"
          accept=".png,.jpg,.jpeg,.webp,.svg,.ico,image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon"
          className="hidden"
          disabled={disabled || busy}
          onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
        />
        <span className="inline-flex h-[40px] w-full max-w-full shrink-0 items-center justify-center rounded-[12px] bg-[#eef2ff] px-3 py-2 text-[12px] font-semibold text-[#4f46e5] dark:bg-[#312e81] dark:text-[#c7d2fe] sm:w-auto">
          Browse
        </span>
      </label>
      {value ? (
        <button
          type="button"
          onClick={onClear}
          disabled={disabled || busy}
          className="text-[12px] font-medium text-[#64748b] transition hover:text-[#111827] disabled:opacity-60 dark:text-[#94a3b8] dark:hover:text-white"
        >
          Remove image
        </button>
      ) : null}
    </div>
  );
}
