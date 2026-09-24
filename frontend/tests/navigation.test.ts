import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  isRouteActive,
  LOCATIONS,
  filterLocationSuggestions,
} from "../lib/navigation.ts";
import {
  isValidEmail,
  getSafeRedirectUrl,
  sanitizeAuthError,
} from "../lib/auth-utils.ts";

describe("Phase 6: Navigation, Authentication & Accessibility Tests", () => {
  describe("Suite 1: Active Route Matching (isRouteActive)", () => {
    it("matches root route '/' strictly when pathname is '/'", () => {
      assert.equal(isRouteActive("/", "/"), true);
    });

    it("does NOT match root route '/' when on another page", () => {
      assert.equal(isRouteActive("/route-planner", "/"), false);
      assert.equal(isRouteActive("/bookmarks", "/"), false);
      assert.equal(isRouteActive("/accessibility", "/"), false);
      assert.equal(isRouteActive("/about", "/"), false);
      assert.equal(isRouteActive("/login", "/"), false);
    });

    it("matches '/route-planner' exactly and on subpaths", () => {
      assert.equal(isRouteActive("/route-planner", "/route-planner"), true);
      assert.equal(isRouteActive("/route-planner/corridor", "/route-planner"), true);
    });

    it("does NOT match partial route prefixes that do not have a slash separator", () => {
      assert.equal(isRouteActive("/route-plannerv2", "/route-planner"), false);
    });

    it("correctly identifies other primary routes", () => {
      assert.equal(isRouteActive("/bookmarks", "/bookmarks"), true);
      assert.equal(isRouteActive("/bookmarks/edit", "/bookmarks"), true);
      assert.equal(isRouteActive("/reports", "/bookmarks"), false);
    });
  });

  describe("Suite 2: Safe Redirect URL Sanitization (getSafeRedirectUrl)", () => {
    it("permits standard internal relative paths", () => {
      assert.equal(getSafeRedirectUrl("/route-planner"), "/route-planner");
      assert.equal(getSafeRedirectUrl("/bookmarks"), "/bookmarks");
      assert.equal(getSafeRedirectUrl("/accessibility"), "/accessibility");
    });

    it("permits internal query parameters", () => {
      assert.equal(
        getSafeRedirectUrl("/route-planner?bookmarkId=bm-12345"),
        "/route-planner?bookmarkId=bm-12345",
      );
    });

    it("safely falls back to '/route-planner' when input is null, undefined, or empty", () => {
      assert.equal(getSafeRedirectUrl(null), "/route-planner");
      assert.equal(getSafeRedirectUrl(undefined), "/route-planner");
      assert.equal(getSafeRedirectUrl(""), "/route-planner");
      assert.equal(getSafeRedirectUrl("   "), "/route-planner");
    });

    it("blocks open redirect attempts to external protocols (http/https)", () => {
      assert.equal(
        getSafeRedirectUrl("https://evil.example.com/phish"),
        "/route-planner",
      );
      assert.equal(
        getSafeRedirectUrl("http://attacker.com"),
        "/route-planner",
      );
    });

    it("blocks protocol-relative URLs (//malicious.com)", () => {
      assert.equal(
        getSafeRedirectUrl("//malicious.com/payload"),
        "/route-planner",
      );
    });

    it("blocks backslash open redirect variations (/\\evil.com)", () => {
      assert.equal(
        getSafeRedirectUrl("/\\evil.com"),
        "/route-planner",
      );
    });

    it("blocks non-HTTP URI schemes", () => {
      assert.equal(
        getSafeRedirectUrl("javascript:alert(document.cookie)"),
        "/route-planner",
      );
      assert.equal(
        getSafeRedirectUrl("data:text/html,<script>alert(1)</script>"),
        "/route-planner",
      );
    });
  });

  describe("Suite 3: Authentication Error Sanitization (sanitizeAuthError)", () => {
    it("sanitizes invalid login credential messages", () => {
      const msg = sanitizeAuthError("Invalid login credentials provided by user");
      assert.equal(
        msg,
        "Invalid email or password. Please verify your credentials and try again.",
      );
    });

    it("sanitizes invalid_grant token errors", () => {
      const msg = sanitizeAuthError("invalid_grant: user not found");
      assert.equal(
        msg,
        "Invalid email or password. Please verify your credentials and try again.",
      );
    });

    it("sanitizes unconfirmed email errors", () => {
      const msg = sanitizeAuthError("Email not confirmed yet");
      assert.equal(
        msg,
        "Please confirm your email address before signing in. Check your inbox for the confirmation link.",
      );
    });

    it("sanitizes already registered user errors", () => {
      const msg = sanitizeAuthError("User already registered with this provider");
      assert.equal(
        msg,
        "An account with this email already exists. Please sign in instead.",
      );
    });

    it("sanitizes rate limiting errors", () => {
      const msg = sanitizeAuthError("Rate limit exceeded: too many requests in 1 minute");
      assert.equal(
        msg,
        "Too many sign-in attempts. Please wait a few minutes before trying again.",
      );
    });

    it("sanitizes raw database internal errors without exposing schema or credentials", () => {
      const rawInternalError =
        'Database error: relation "auth.identities" does not exist at postgres://user:secret@db.internal:5432';
      const sanitized = sanitizeAuthError(rawInternalError);
      assert.equal(
        sanitized,
        "Authentication could not be completed. Please verify your details or try again later.",
      );
      assert.equal(sanitized.includes("postgres"), false);
      assert.equal(sanitized.includes("secret"), false);
    });
  });

  describe("Suite 4: Email Validation (isValidEmail)", () => {
    it("accepts valid email addresses", () => {
      assert.equal(isValidEmail("officer@assam.gov.in"), true);
      assert.equal(isValidEmail("relief.dispatch@ner-connect.ai"), true);
      assert.equal(isValidEmail("user+test@sub.domain.org"), true);
    });

    it("rejects malformed email strings", () => {
      assert.equal(isValidEmail(""), false);
      assert.equal(isValidEmail("notanemail"), false);
      assert.equal(isValidEmail("missing@domain"), false);
      assert.equal(isValidEmail("@nodomain.com"), false);
      assert.equal(isValidEmail("has spaces@domain.com"), false);
    });
  });

  describe("Suite 5: Location Combobox Suggestions (filterLocationSuggestions)", () => {
    it("returns all standard locations when query is empty and recent is empty", () => {
      const result = filterLocationSuggestions("", LOCATIONS, []);
      assert.equal(result.filteredRecent.length, 0);
      assert.equal(result.filteredLocations.length, LOCATIONS.length);
      assert.equal(result.allVisibleOptions.length, LOCATIONS.length);
    });

    it("prioritizes recent locations at the top of visible options", () => {
      const recent = ["Guwahati", "Shillong"];
      const result = filterLocationSuggestions("", LOCATIONS, recent);
      assert.equal(result.filteredRecent.length, 2);
      assert.deepEqual(result.filteredRecent, ["Guwahati", "Shillong"]);
      // Deduplicated: Guwahati and Shillong must not appear twice
      assert.equal(result.filteredLocations.includes("Guwahati"), false);
      assert.equal(result.filteredLocations.includes("Shillong"), false);
      assert.equal(result.allVisibleOptions[0], "Guwahati");
      assert.equal(result.allVisibleOptions[1], "Shillong");
    });

    it("filters options case-insensitively by query", () => {
      const result = filterLocationSuggestions("shill", LOCATIONS, []);
      assert.equal(result.filteredLocations.length, 1);
      assert.equal(result.filteredLocations[0], "Shillong");
    });

    it("returns empty when query matches no location", () => {
      const result = filterLocationSuggestions("NonexistentCity", LOCATIONS, []);
      assert.equal(result.filteredRecent.length, 0);
      assert.equal(result.filteredLocations.length, 0);
      assert.equal(result.allVisibleOptions.length, 0);
    });
  });
});
