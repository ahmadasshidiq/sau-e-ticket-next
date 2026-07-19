import { assertApiSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toCsvRow } from "@/lib/csv";

export async function GET() {
  const unauthorized = await assertApiSession();
  if (unauthorized) return unauthorized;

  const vessels = await prisma.vessel.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      name: true,
      type: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const csv = [
    toCsvRow(["name", "type", "createdAt", "updatedAt"]),
    ...vessels.map((vessel) =>
      toCsvRow([
        vessel.name,
        vessel.type,
        vessel.createdAt.toISOString(),
        vessel.updatedAt.toISOString(),
      ])
    ),
  ].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="vessels.csv"',
    },
  });
}
