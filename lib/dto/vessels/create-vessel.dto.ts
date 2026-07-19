import type { VesselType } from "@prisma/client";

export interface CreateVesselDto {
  name: string;
  type: VesselType;
}
