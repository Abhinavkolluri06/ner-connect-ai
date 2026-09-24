/**
 * Pure navigation and routing utility helpers for NER-Connect AI.
 */

export interface NavItem {
  href: string;
  label: string;
  icon: string;
  badge?: string;
}

export const PRIMARY_NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/route-planner", label: "Route Planner", icon: "🗺️" },
  { href: "/bookmarks", label: "Bookmarks", icon: "★" },
  { href: "/accessibility", label: "Accessibility", icon: "♿" },
  { href: "/about", label: "About", icon: "ℹ️" },
];

/**
 * Determines whether a target route href should be marked active given the current pathname.
 * Root route ('/') matches strictly on exact match to avoid false positive active states.
 * Other routes match on exact match or nested sub-paths.
 */
export function isRouteActive(currentPath: string, targetHref: string): boolean {
  if (targetHref === "/") {
    return currentPath === "/";
  }
  return currentPath === targetHref || currentPath.startsWith(targetHref + "/");
}

export const LOCATIONS: string[] = [
  "Guwahati",
  "Shillong",
  "Cherrapunji",
  "Sohra",
  "Imphal",
  "Kohima",
  "Agartala",
  "Aizawl",
  "Gangtok",
  "Itanagar",
  "Dimapur",
  "Silchar",
  "Tura",
];

export interface FilteredLocationResult {
  filteredRecent: string[];
  filteredLocations: string[];
  allVisibleOptions: string[];
}

/**
 * Filters and deduplicates location suggestions against a user search query.
 * Recent searches are prioritized at the top of the option list.
 */
export function filterLocationSuggestions(
  query: string,
  locations: string[] = LOCATIONS,
  recent: string[] = [],
): FilteredLocationResult {
  const q = query.trim().toLowerCase();
  const filteredRecent = recent.filter((loc) =>
    loc.toLowerCase().includes(q),
  );
  const filteredLocations = locations.filter(
    (loc) => loc.toLowerCase().includes(q) && !filteredRecent.includes(loc),
  );
  return {
    filteredRecent,
    filteredLocations,
    allVisibleOptions: [...filteredRecent, ...filteredLocations],
  };
}
