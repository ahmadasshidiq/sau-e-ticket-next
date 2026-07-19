export interface InvoiceItemDto {
  id?: string;
  vesselId?: string | null;
  passenger: string;
  rankId?: string | null;
  status?: string | null;
  serviceArea?: string | null;
  serviceMode?: string | null;
  serviceProvider?: string | null;
  serviceDetail?: string | null;
  lineNumber?: number | null;
  fare?: string | number | null;
}
