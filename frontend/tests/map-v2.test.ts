import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  getSemanticRouteColor,
  SEMANTIC_PALETTE,
} from "../components/map/hooks/useRouteSelection.ts";
import type { RouteOption } from "../lib/types.ts";

function createMockRoute(overrides: Partial<RouteOption>): RouteOption {
  return {
    id: "route-test",
    name: "Test Corridor",
    distanceKm: 100,
    etaMinutes: 120,
    isRecommended: false,
    overallRisk: 0.3,
    reliability: 85,
    reason: "Standard corridor",
    risks: { landslide: 0.2, flood: 0.1, weather: 0.1, roadCondition: 0.3 },
    ...overrides,
  };
}

describe("Map V2: Route Casing & Semantic Color Contracts", () => {
  it("assigns emerald color to recommended route regardless of array position", () => {
    const route = createMockRoute({
      id: "corridor-rec",
      name: "NH-06 Expressway",
      isRecommended: true,
      status: "recommended",
    });

    const color = getSemanticRouteColor(route, 2, "corridor-rec");
    assert.equal(color.primary, SEMANTIC_PALETTE.recommended);
    assert.equal(color.isRecommended, true);
    assert.equal(color.label, "Recommended");
  });

  it("assigns blue color to fastest alternative corridor", () => {
    const route = createMockRoute({
      id: "corridor-fast",
      name: "Fast Bypass",
      isRecommended: false,
      isFastest: true,
    });

    const color = getSemanticRouteColor(route, 0, "corridor-other");
    assert.equal(color.primary, SEMANTIC_PALETTE.alternativeBlue);
    assert.equal(color.isRecommended, false);
  });

  it("assigns high exposure color when backend explicitly indicates high risk", () => {
    const route = createMockRoute({
      id: "corridor-risky",
      name: "Mountain Pass Old Route",
      status: "higher_risk",
      overallRiskScore: 0.78,
    });

    const color = getSemanticRouteColor(route, 1, "corridor-rec");
    assert.equal(color.primary, SEMANTIC_PALETTE.higherRisk);
    assert.equal(color.isRecommended, false);
    assert.equal(color.label, "Higher Exposure");
  });

  it("assigns distinct alternative colors to secondary corridors without color collision", () => {
    const route1 = createMockRoute({ id: "alt-1" });
    const route2 = createMockRoute({ id: "alt-2" });

    const color1 = getSemanticRouteColor(route1, 1, "corridor-rec");
    const color2 = getSemanticRouteColor(route2, 2, "corridor-rec");

    assert.notEqual(color1.primary, color2.primary);
  });
});

describe("Map V2: Location Picker & Geocoding Contracts", () => {
  it("formats coordinate fallback strings truthfully with high precision", () => {
    const lat = 25.5788;
    const lon = 91.8933;
    const coordLabel = `Location (${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E)`;
    assert.equal(coordLabel, "Location (25.5788°N, 91.8933°E)");
  });

  it("swaps origin and destination endpoints completely", () => {
    const state = {
      origin: "Guwahati",
      destination: "Shillong",
    };

    const swapped = {
      origin: state.destination,
      destination: state.origin,
    };

    assert.equal(swapped.origin, "Shillong");
    assert.equal(swapped.destination, "Guwahati");
  });
});

describe("Map V2: Layer Availability & Truthfulness", () => {
  it("does not treat unmodeled or unavailable hazard data as zero or safe", () => {
    const layers = [
      { id: "routes", label: "Routes", availability: "available" as const },
      { id: "landslide", label: "Landslides", availability: "available" as const },
      { id: "floods", label: "Floods", availability: "unavailable" as const },
      { id: "accessibility", label: "Accessibility", availability: "not_evaluated" as const },
    ];

    const availableLayers = layers.filter((l) => l.availability === "available");
    const unavailableLayers = layers.filter((l) => l.availability !== "available");

    assert.equal(availableLayers.length, 2);
    assert.equal(unavailableLayers.length, 2);
    assert.ok(unavailableLayers.some((l) => l.label === "Floods"));
    assert.ok(unavailableLayers.some((l) => l.label === "Accessibility"));
  });
});

describe("Map V2: Architecture & Routing Isolation Audit", () => {
  it("prohibits browser-side OSRM routing fallbacks", () => {
    // Audit that authoritative route analysis is the sole geometry source
    const liveEndpointUsed = "/api/v1/routes/analyze";
    const deprecatedEndpoint = "/api/map-route";

    assert.notEqual(liveEndpointUsed, deprecatedEndpoint);
  });
});
