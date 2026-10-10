"use client"

import { labelFor, type ApiFieldError } from "@/lib/field-labels"

/**
 * Shows exactly which field(s) failed and why, itemized — not a single
 * generic "something went wrong" message. Each line names the field in
 * Persian (via FIELD_LABELS) so whoever's entering data can go straight
 * to the field that needs fixing instead of guessing.
 */
export function ErrorSummary({ errors }: { errors: ApiFieldError[] }) {
  if (errors.length === 0) return null
  return (
    <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3">
      <p className="mb-1.5 text-sm font-semibold text-destructive">
        {errors.length === 1 ? "یک خطا یافت شد:" : `${errors.length} خطا یافت شد:`}
      </p>
      <ul className="space-y-1 text-sm text-destructive">
        {errors.map((err, i) => (
          <li key={i}>
            <span className="font-medium">{labelFor(err.field)}:</span>{" "}
            {err.messages.join(" — ")}
          </li>
        ))}
      </ul>
    </div>
  )
}
