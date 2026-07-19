import type { TemplateType } from "@prisma/client";

export interface CreateTemplateDto {
  name: string;
  type: TemplateType;
  preview?: string | null;
  html: string;
  description?: string | null;
  isDefault?: boolean;
}
