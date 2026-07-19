export type SettingsResponse = {
  id: string;
  applicationName: string;
  companyName: string | null;
  logoWhite: string | null;
  logoColored: string | null;
  favicon: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type SettingsFormState = {
  applicationName: string;
  companyName: string;
  logoWhite: string;
  logoColored: string;
  favicon: string;
};

export const pageTitle = "Settings";
export const pageDescription =
  "Manage application branding and company information.";

export const defaultSettingsForm: SettingsFormState = {
  applicationName: "",
  companyName: "",
  logoWhite: "",
  logoColored: "",
  favicon: "",
};

export function buildSettingsForm(
  settings?: Partial<SettingsResponse>
): SettingsFormState {
  return {
    applicationName: settings?.applicationName ?? "",
    companyName: settings?.companyName ?? "",
    logoWhite: settings?.logoWhite ?? "",
    logoColored: settings?.logoColored ?? "",
    favicon: settings?.favicon ?? "",
  };
}
