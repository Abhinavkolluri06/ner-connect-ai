/**
 * Pure authentication and redirect security utilities for NER-Connect AI.
 */

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Validates and sanitizes a return or redirect URL.
 * Only allows relative internal application paths to prevent open redirect vulnerabilities.
 */
export function getSafeRedirectUrl(param: string | null | undefined): string {
  if (!param) return "/route-planner";
  const trimmed = param.trim();
  if (
    trimmed.startsWith("/") &&
    !trimmed.startsWith("//") &&
    !trimmed.includes("://") &&
    !trimmed.includes("\\") &&
    !trimmed.startsWith("/ ")
  ) {
    return trimmed;
  }
  return "/route-planner";
}

/**
 * Sanitizes raw Supabase or server authentication errors into clear, operational messages.
 * Prevents disclosure of internal database schemas, tables, or infrastructure hostnames.
 */
export function sanitizeAuthError(rawMsg: string): string {
  const lower = rawMsg.toLowerCase();
  if (
    lower.includes("invalid login credentials") ||
    lower.includes("invalid_grant")
  ) {
    return "Invalid email or password. Please verify your credentials and try again.";
  }
  if (lower.includes("email not confirmed")) {
    return "Please confirm your email address before signing in. Check your inbox for the confirmation link.";
  }
  if (lower.includes("user already registered")) {
    return "An account with this email already exists. Please sign in instead.";
  }
  if (lower.includes("rate limit") || lower.includes("too many requests")) {
    return "Too many sign-in attempts. Please wait a few minutes before trying again.";
  }
  if (lower.includes("password should be at least")) {
    return "Password must be at least 8 characters.";
  }
  return "Authentication could not be completed. Please verify your details or try again later.";
}
