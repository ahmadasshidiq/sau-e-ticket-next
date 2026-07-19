import { assertApiSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toCsvRow } from "@/lib/csv";

export async function GET() {
  const unauthorized = await assertApiSession();
  if (unauthorized) return unauthorized;

  const ranks = await prisma.rank.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      name: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const csv = [
    toCsvRow(["name", "createdAt", "updatedAt"]),
    ...ranks.map((rank) =>
      toCsvRow([
        rank.name,
        rank.createdAt.toISOString(),
        rank.updatedAt.toISOString(),
      ])
    ),
  ].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="ranks.csv"',
    },
  });
}
