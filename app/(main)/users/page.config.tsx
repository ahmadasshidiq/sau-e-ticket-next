import type { ReactNode } from "react";
import type { UserRole, UserStatus } from "@prisma/client";
import type {
  DataColumn,
  FilterField,
} from "@/components/dynamic-page";
import { formatCellValue, formatDateTimeDisplay } from "@/lib/formatters";
import { buildSearchParams } from "@/lib/search-params";

export type UserApiRow = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
};

export type UsersResponse = {
  data: UserApiRow[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type UserFormState = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  status: UserStatus;
};

export type UserRow = {
  id: string;
  no: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  actions?: string;
};

export const defaultUserForm: UserFormState = {
  name: "",
  email: "",
  password: "",
  role: "USER",
  status: "ACTIVE",
};

export const pageTitle = "Users";
export const pageDescription = "Manage internal users and permission access.";

export const filterFields: FilterField[] = [
  {
    key: "name",
    label: "Name",
    placeholder: "Search name",
  },
  {
    key: "email",
    label: "Email",
    placeholder: "Search email",
  },
  {
    key: "role",
    label: "Role",
    placeholder: "Search role",
  },
  {
    key: "status",
    label: "Status",
    placeholder: "Search status",
  },
];

export function buildUsersSearchParams(
  page: number,
  pageSize: number,
  filters: Record<string, string>
) {
  return buildSearchParams({ page, pageSize }, filters);
}

export function mapUsersToRows(
  users: UserApiRow[],
  startIndex = 0
): UserRow[] {
  return users.map((user, index) => ({
    id: user.id,
    no: String(startIndex + index + 1),
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    createdAt: formatDateTimeDisplay(user.createdAt),
    updatedAt: formatDateTimeDisplay(user.updatedAt),
  }));
}

export function buildEditUser(user: UserRow): UserApiRow {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    createdAt: "",
    updatedAt: "",
  };
}

export function buildUserForm(
  user?: Pick<UserRow, "name" | "email" | "role" | "status">
): UserFormState {
  if (!user) {
    return defaultUserForm;
  }

  return {
    name: user.name,
    email: user.email,
    password: "",
    role: user.role,
    status: user.status,
  };
}

export function getUserColumns(
  renderActions: (row: UserRow) => ReactNode
): DataColumn<UserRow>[] {
  return [
    {
      key: "no",
      title: "No",
      textClassName: "font-medium text-slate-700",
      widthClassName: "w-[72px]",
    },
    {
      key: "name",
      title: "Name",
      textClassName: "font-semibold text-slate-900",
    },
    {
      key: "email",
      title: "Email",
      formatter: (value) => formatCellValue(value),
    },
    {
      key: "role",
      title: "Role",
      formatter: (value) => formatBadge(value, "indigo"),
    },
    {
      key: "status",
      title: "Status",
      formatter: (value) => formatBadge(value, value === "ACTIVE" ? "green" : "slate"),
    },
    {
      key: "createdAt",
      title: "Created At",
      formatter: (value) => formatCellValue(value),
    },
    {
      key: "updatedAt",
      title: "Updated At",
      formatter: (value) => formatCellValue(value),
    },
    {
      key: "actions",
      title: "Actions",
      align: "center",
      formatter: (_value, row) => renderActions(row),
    },
  ];
}

function formatBadge(value: unknown, tone: "green" | "indigo" | "slate") {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  const toneClassName =
    tone === "green"
      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
      : tone === "indigo"
        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"
        : "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[12px] font-semibold ${toneClassName}`}
    >
      {String(value)}
    </span>
  );
}
