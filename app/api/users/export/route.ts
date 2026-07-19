import { assertAdminApiSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toCsvRow } from "@/lib/csv";

export async function GET() {
  const unauthorized = await assertAdminApiSession();
  if (unauthorized) return unauthorized;

  const users = await prisma.user.findMany({
    orderBy: {
      createdAt: "desc",
    },
    select: {
      name: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const csv = [
    toCsvRow(["name", "email", "role", "status", "createdAt", "updatedAt"]),
    ...users.map((user) =>
      toCsvRow([
        user.name,
        user.email,
        user.role,
        user.status,
        user.createdAt.toISOString(),
        user.updatedAt.toISOString(),
      ])
    ),
  ].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="users.csv"',
    },
  });
}
