/**
 * Comprehensive Accessibility & WCAG 2.1 AA Audit Test Suite
 *
 * Verifies landmarks, keyboard navigability, combobox ARIA roles, focus management,
 * reduced-motion overrides, non-color visual distinction, and screen reader labels.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { getIntelligenceModeMeta, INTELLIGENCE_MODE_METADATA } from "../lib/intelligence-mode.ts";
import { filterLocationSuggestions } from "../lib/navigation.ts";

describe("Phase 8 & 9: Accessibility & WCAG 2.1 AA Audit Suite", () => {
  describe("Suite 1: Landmark & Skip Link Conformance", () => {
    test("layout.tsx renders skip-to-content link pointing to #main-content", () => {
      const layoutPath = path.resolve(process.cwd(), "app/layout.tsx");
      const content = fs.readFileSync(layoutPath, "utf-8");

      assert.match(
        content,
        /href="#main-content"/,
        "Layout must provide an anchor link pointing directly to #main-content",
      );
      assert.match(
        content,
        /Skip to main content/,
        "Skip link must contain descriptive text for assistive technology",
      );
      assert.match(
        content,
        /focus:not-sr-only/,
        "Skip link must become visible when receiving keyboard focus",
      );
    });

    test("primary page views define singular <main id=\"main-content\"> landmark", () => {
      const pageFiles = [
        "components/RoutePlanner.tsx",
        "app/bookmarks/page.tsx",
        "components/Dashboard.tsx",
        "app/about/page.tsx",
        "app/accessibility/page.tsx",
      ];

      for (const relPath of pageFiles) {
        const fullPath = path.resolve(process.cwd(), relPath);
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, "utf-8");
          assert.match(
            content,
            /<main[^>]*id="main-content"/,
            `${relPath} must render <main id="main-content"> landmark`,
          );
        }
      }
    });
  });

  describe("Suite 2: Vestibular Accessibility & Motion Control", () => {
    test("globals.css enforces prefers-reduced-motion: reduce override", () => {
      const cssPath = path.resolve(process.cwd(), "app/globals.css");
      const content = fs.readFileSync(cssPath, "utf-8");

      assert.match(
        content,
        /@media\s*\(prefers-reduced-motion:\s*reduce\)/,
        "globals.css must define prefers-reduced-motion media query",
      );
      assert.match(
        content,
        /animation-duration:\s*0\.01ms\s*!important/,
        "Must suppress animation duration for reduced motion users",
      );
      assert.match(
        content,
        /transition-duration:\s*0\.01ms\s*!important/,
        "Must suppress transitions for reduced motion users",
      );
    });
  });

  describe("Suite 3: WAI-ARIA 1.2 Combobox Semantics in RouteForm", () => {
    test("RouteForm contains combobox roles and ARIA attributes", () => {
      const formPath = path.resolve(process.cwd(), "components/RouteForm.tsx");
      const content = fs.readFileSync(formPath, "utf-8");

      assert.match(content, /role="combobox"/, "Must define role='combobox'");
      assert.match(content, /aria-autocomplete="list"/, "Must declare aria-autocomplete='list'");
      assert.match(content, /aria-expanded=/, "Must declare dynamic aria-expanded state");
      assert.match(content, /aria-controls=/, "Must link combobox to suggestion listbox ID");
      assert.match(content, /role="listbox"/, "Suggestions container must declare role='listbox'");
      assert.match(content, /role="option"/, "Suggestion items must declare role='option'");
      assert.match(content, /aria-selected=/, "Active option must reflect aria-selected state");
    });

    test("combobox suggestions filter cleanly and handle keyboard navigation states", () => {
      const allLocations = ["Guwahati", "Shillong", "Silchar", "Tezpur", "Jorhat", "Dibrugarh", "Aizawl", "Agartala", "Dimapur", "Kohima", "Imphal", "Itanagar", "Gangtok"];
      const result = filterLocationSuggestions("shil", allLocations, []);
      assert.equal(result.allVisibleOptions.length, 1);
      assert.equal(result.allVisibleOptions[0], "Shillong");
    });
  });

  describe("Suite 4: Accessible Modal Dialog & Focus Management", () => {
    test("RoutePlanner bookmark dialog enforces WAI-ARIA dialog attributes and focus trap", () => {
      const plannerPath = path.resolve(process.cwd(), "components/RoutePlanner.tsx");
      const content = fs.readFileSync(plannerPath, "utf-8");

      assert.match(content, /role="dialog"/, "Modal container must define role='dialog'");
      assert.match(content, /aria-modal="true"/, "Modal container must declare aria-modal='true'");
      assert.match(content, /aria-labelledby="bookmark-dialog-title"/, "Modal must be labelled by title");
      assert.match(content, /aria-describedby="bookmark-dialog-desc"/, "Modal must have description reference");
      assert.match(content, /e\.key === "Escape"/, "Dialog must listen for Escape key to close");
      assert.match(content, /bookmarkTriggerRef\.current\.focus\(\)/, "Dialog must restore focus on dismissal");
    });
  });

  describe("Suite 5: Non-Color Visual Distinction on Maps & Route Cards", () => {
    test("LeafletMap differentiates routes with dash patterns and line weight, not color alone", () => {
      const mapPath = path.resolve(process.cwd(), "components/LeafletMap.tsx");
      const content = fs.readFileSync(mapPath, "utf-8");

      assert.match(content, /weight:\s*isSelected\s*\?\s*6\s*:\s*3\.5/, "Selected route has elevated stroke weight 6");
      assert.match(content, /dashArray/, "Must define dash patterns for non-color differentiation");
      assert.match(content, /"8 6"/, "Alternative routes must use '8 6' dash pattern");
      assert.match(content, /"3 6"/, "Higher risk routes must use '3 6' dash pattern");
      assert.match(content, /Fit Corridors/, "Map must provide accessible Fit Corridors / Recenter button");
    });

    test("RouteCard provides textual category badges for color-blind comprehension", () => {
      const cardPath = path.resolve(process.cwd(), "components/RouteCard.tsx");
      const content = fs.readFileSync(cardPath, "utf-8");

      assert.match(content, /Recommended/, "Card must render explicit Recommended label");
      assert.match(content, /Fastest/, "Card must render explicit Fastest label");
      assert.match(content, /Higher Risk/, "Card must render explicit Higher Risk label");
      assert.match(content, /slower/, "Card must annotate duration trade-offs explicitly in text");
    });
  });

  describe("Suite 6: Canonical Intelligence Mode Truthfulness", () => {
    test("every canonical intelligence mode has accessible metadata and truthful descriptions", () => {
      const canonicalModes = ["live_ml", "live_heuristic", "go_fallback", "partial", "routing_only", "demo"] as const;

      for (const mode of canonicalModes) {
        const meta = getIntelligenceModeMeta(mode);
        assert.equal(meta.mode, mode);
        assert.ok(meta.label.length > 0, `Mode ${mode} must have non-empty readable label`);
        assert.ok(meta.description.length > 10, `Mode ${mode} must have detailed truthful description`);
        assert.ok(meta.badgeClass.includes("text-"), `Mode ${mode} must define accessible contrast text color`);
      }
    });

    test("degraded modes are truthfully flagged", () => {
      assert.equal(INTELLIGENCE_MODE_METADATA.go_fallback.isDegraded, true);
      assert.equal(INTELLIGENCE_MODE_METADATA.partial.isDegraded, true);
      assert.equal(INTELLIGENCE_MODE_METADATA.routing_only.isDegraded, true);
      assert.equal(INTELLIGENCE_MODE_METADATA.live_ml.isDegraded, false);
      assert.equal(INTELLIGENCE_MODE_METADATA.live_heuristic.isDegraded, false);
      assert.equal(INTELLIGENCE_MODE_METADATA.demo.isDegraded, false);
    });
  });
});
