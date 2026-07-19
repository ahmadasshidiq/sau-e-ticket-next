export function normalizeEnumValue<T extends string>(
  value: string | null | undefined,
  allowedValues: readonly T[],
  fallback: T
): T {
  const normalizedValue = value?.toUpperCase() as T | undefined;

  if (normalizedValue && allowedValues.includes(normalizedValue)) {
    return normalizedValue;
  }

  return fallback;
}
