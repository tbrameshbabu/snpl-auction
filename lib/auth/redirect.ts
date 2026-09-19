// Accepts only same-origin absolute paths ("/team-owner?x=1"), rejecting
// protocol-relative ("//evil.com"), scheme ("https://..."), and backslash tricks.
export function safeRedirectPath(candidate: string | null | undefined, fallback = '/'): string {
  if (!candidate) return fallback
  if (!candidate.startsWith('/') || candidate.startsWith('//') || candidate.startsWith('/\\')) {
    return fallback
  }
  if (/[\r\n\\]/.test(candidate)) return fallback
  return candidate
}
