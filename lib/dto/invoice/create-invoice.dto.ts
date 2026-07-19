import type { InvoiceItemDto } from "./invoice-item.dto";

export interface CreateInvoiceDto {
  invoiceNumber?: string | null;
  vendor?: string | null;
  customer?: string | null;
  invoiceDate?: Date | string | null;
  dueDate?: Date | string | null;
  subtotal?: string | number | null;
  tax?: string | number | null;
  total?: string | number | null;
  notes?: string | null;
  originalFileName: string;
  objectKey: string;
  currency?: string | null;
  rawText?: string | null;
  items?: InvoiceItemDto[];
}
