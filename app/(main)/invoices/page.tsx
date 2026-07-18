"use client";

import { DashboardShell } from "@/components/dashboard-shell";
import { DynamicPage } from "@/components/dynamic-page";
import { pageConfig } from "./page.config";

export default function InvoicesPage() {
  return (
    <DashboardShell
      title={pageConfig.title}
      description={pageConfig.description}
    >
      <DynamicPage
        columns={pageConfig.columns}
        rows={pageConfig.rows}
        primaryAction={pageConfig.primaryAction}
        filterFields={pageConfig.filterFields}
        filterContent={pageConfig.filterContent}
        columnContent={pageConfig.columnContent}
        emptyRows={pageConfig.emptyRows}
        pageSizeOptions={pageConfig.pageSizeOptions}
        initialPageSize={pageConfig.initialPageSize}
      />
    </DashboardShell>
  );
}
