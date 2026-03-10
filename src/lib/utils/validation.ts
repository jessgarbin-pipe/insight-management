export function validateRequired(
  body: Record<string, unknown>,
  fields: string[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  for (const field of fields) {
    if (
      body[field] === undefined ||
      body[field] === null ||
      body[field] === ""
    ) {
      errors.push(`${field} is required`);
    }
  }
  return { valid: errors.length === 0, errors };
}
