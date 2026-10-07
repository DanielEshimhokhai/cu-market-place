import type { ZodError } from "zod";

export type ActionResult = { ok: true; message?: string } | { ok: false; error?: string; fieldErrors?: Record<string, string> };

/** First error message per field, keyed by the top-level path segment. */
export function fieldErrors(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export const invalid = (error: ZodError): ActionResult => ({ ok: false, fieldErrors: fieldErrors(error) });
