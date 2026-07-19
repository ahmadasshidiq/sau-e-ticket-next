import { assertApiSession } from "@/lib/auth";
import { toCsvRow } from "@/lib/csv";

export async function GET() {
  const unauthorized = await assertApiSession();
  if (unauthorized) return unauthorized;

  const csv = [
    toCsvRow(["name", "email", "password", "role", "status"]),
    toCsvRow(["John Doe", "john@example.com", "ChangeMe123!", "USER", "ACTIVE"]),
  ].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="users-template.csv"',
    },
  });
}
