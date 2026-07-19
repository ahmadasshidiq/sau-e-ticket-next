import { prisma } from "@/lib/prisma";

export type AppSettings = {
  id: string;
  applicationName: string;
  companyName: string | null;
  logoWhite: string | null;
  logoColored: string | null;
  favicon: string | null;
};

export const defaultAppSettings: AppSettings = {
  id: "",
  applicationName: "SAU I-Ticket",
  companyName: "Sinergi Arah Utama",
  logoWhite: null,
  logoColored: null,
  favicon: null,
};

export async function getAppSettings(): Promise<AppSettings> {
  const setting = await prisma.setting.findFirst({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      applicationName: true,
      companyName: true,
      logoWhite: true,
      logoColored: true,
      favicon: true,
    },
  });

  if (!setting) {
    return defaultAppSettings;
  }

  return {
    id: setting.id,
    applicationName: setting.applicationName,
    companyName: setting.companyName,
    logoWhite: setting.logoWhite,
    logoColored: setting.logoColored,
    favicon: setting.favicon,
  };
}
