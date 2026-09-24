/**
 * Formatting Utilities for NER-Connect AI
 */

/**
 * Formats duration in minutes into human-readable string (e.g., "2h 45m" or "45m").
 */
export function formatEta(minutes: number): string {
  if (isNaN(minutes) || minutes < 0) return "--";
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);

  if (hours === 0) {
    return `${mins}m`;
  }
  return `${hours}h ${mins.toString().padStart(2, "0")}m`;
}

/**
 * Formats distance in km with one decimal place.
 */
export function formatDistance(distanceKm: number): string {
  if (isNaN(distanceKm) || distanceKm < 0) return "-- km";
  return `${(Math.round(distanceKm * 10) / 10).toFixed(1)} km`;
}

/**
 * Formats a risk percentage or returns "Not evaluated" if null.
 */
export function formatRiskScore(risk: number | null | undefined): string {
  if (risk === null || risk === undefined || isNaN(risk)) {
    return "Not evaluated";
  }
  return `${Math.round(risk)}%`;
}

/**
 * Formats ISO date string into human-readable timestamp.
 */
export function formatDateTime(isoString: string | null | undefined): string {
  if (!isoString) return "--";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "--";
    return d.toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return isoString;
  }
}
