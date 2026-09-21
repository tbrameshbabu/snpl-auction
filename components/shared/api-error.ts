/**
 * Normalises API error payloads and thrown values into a display string.
 * Handles `{ error: string }`, `{ error: ZodIssue[] }`, `{ message }` and Error instances,
 * so components never render a raw object into JSX.
 */

interface IssueLike {
  message?: unknown;
  path?: unknown;
}

function issueToString(issue: IssueLike): string | null {
  if (typeof issue.message !== "string") return null;
  const path = Array.isArray(issue.path)
    ? issue.path.filter((p) => typeof p === "string").join(".")
    : "";
  return path ? `${path}: ${issue.message}` : issue.message;
}

export function getApiErrorMessage(payload: unknown, fallback: string): string {
  if (typeof payload === "string" && payload.trim()) return payload;
  if (payload && typeof payload === "object") {
    const { error, message } = payload as {
      error?: unknown;
      message?: unknown;
    };
    if (typeof error === "string" && error.trim()) return error;
    if (Array.isArray(error)) {
      const parts = error
        .map((issue) =>
          issue && typeof issue === "object"
            ? issueToString(issue as IssueLike)
            : null,
        )
        .filter((s): s is string => s !== null);
      if (parts.length) return parts.join("; ");
    }
    if (error && typeof error === "object") {
      const nested = getApiErrorMessage(error, "");
      if (nested) return nested;
    }
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

export function toErrorMessage(
  err: unknown,
  fallback = "Something went wrong",
): string {
  if (err instanceof Error && err.message) return err.message;
  return getApiErrorMessage(err, fallback);
}

/** Reads the JSON body of a failed response and returns a safe message. */
export async function readApiError(
  res: Response,
  fallback: string,
): Promise<string> {
  try {
    const body: unknown = await res.json();
    return getApiErrorMessage(body, fallback);
  } catch {
    return res.statusText
      ? `${fallback} (${res.status} ${res.statusText})`
      : fallback;
  }
}
