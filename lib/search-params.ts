export function buildSearchParams(
  baseParams: Record<string, string | number>,
  filters: Record<string, string>
) {
  const searchParams = new URLSearchParams(
    Object.entries(baseParams).reduce<Record<string, string>>((acc, [key, value]) => {
      acc[key] = String(value);
      return acc;
    }, {})
  );

  for (const [key, value] of Object.entries(filters)) {
    if (value.trim()) {
      searchParams.set(key, value.trim());
    }
  }

  return searchParams;
}
