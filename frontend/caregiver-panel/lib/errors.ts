/**
 * Extracts a real, specific error message from an API error response,
 * instead of a generic fallback that hides what actually went wrong.
 *
 * Backend errors on this platform come in two different shapes:
 *   - {"detail": "..."} — used by most action endpoints (login,
 *     OTP verify, lockouts, etc.)
 *   - {"field_name": ["..."]} — DRF's default serializer validation
 *     error shape (e.g. a malformed phone number)
 *
 * Found and fixed after a real, systemic bug: every panel's login
 * page had a bare `catch { setError("...") }` that discarded whatever
 * specific message the backend actually sent, showing a vague generic
 * message (or, worse, a hardcoded "wrong username/password" even when
 * the real cause was an account lockout) for every possible failure.
 */
export function extractErrorMessage(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: unknown } })?.response?.data
  if (!data || typeof data !== "object") return fallback

  const record = data as Record<string, unknown>
  if (typeof record.detail === "string") return record.detail

  for (const key of Object.keys(record)) {
    const value = record[key]
    if (Array.isArray(value) && typeof value[0] === "string") {
      return value[0]
    }
  }
  return fallback
}
