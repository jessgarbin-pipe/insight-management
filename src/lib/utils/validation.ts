export function validateRequired(
  body: Record<string, unknown>,
  fields: string[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  for (const field of fields) {
    const value = body[field];
    if (value === undefined || value === null || value === "") {
      errors.push(`${field} is required`);
    }
  }
  return { valid: errors.length === 0, errors };
}

export function validateEnum(
  value: unknown,
  allowed: readonly string[]
): boolean {
  return typeof value === "string" && allowed.includes(value);
}

export function validateNumericRange(
  value: unknown,
  min: number,
  max: number
): boolean {
  if (value === null || value === undefined) return true;
  const num = Number(value);
  return !isNaN(num) && num >= min && num <= max;
}
