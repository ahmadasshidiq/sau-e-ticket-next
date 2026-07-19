import type { VesselType } from "@prisma/client";

export interface UpdateVesselDto {
  name?: string;
  type?: VesselType;
}
