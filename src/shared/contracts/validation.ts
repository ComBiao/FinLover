import type { z } from 'zod';
/** Consistently report the first issue for each field. */
export function validationFields(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) fields[issue.path.join('.') || 'root'] ??= issue.message;
  return fields;
}
