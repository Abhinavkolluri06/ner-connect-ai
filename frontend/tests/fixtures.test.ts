import test from "node:test";
import assert from "node:assert/strict";

import {
  DEMO_BACKEND_ANALYZE_RESPONSE,
  DEMO_ROUTE_REQUEST,
  getDemoRouteResponse,
  isDemoCorridor,
} from "../lib/demo/fixtures.ts";
import { validateAnalyzeResponse } from "../lib/api/validators.ts";
import {
  formatDistance,
  formatEta,
  formatRiskScore,
} from "../lib/utils/format.ts";

test("Demo Fixtures & Formatters", async (t) => {
  await t.test("DEMO_BACKEND_ANALYZE_RESPONSE satisfies canonical contract schema", () => {
    const validated = validateAnalyzeResponse(DEMO_BACKEND_ANALYZE_RESPONSE);
    assert.equal(validated.intelligence_mode, "demo");
    assert.equal(validated.recommended_route_id, "route-b");
    assert.equal(validated.routes.length, 3);
  });

  await t.test("getDemoRouteResponse produces valid RouteResponse without array-0 fallback", () => {
    const response = getDemoRouteResponse();
    assert.equal(response.origin, DEMO_ROUTE_REQUEST.origin);
    assert.equal(response.destination, DEMO_ROUTE_REQUEST.destination);
    assert.equal(response.recommendedRouteId, "route-b");

    const recommended = response.routes.find((r) => r.isRecommended);
    assert.ok(recommended, "Recommended route must exist");
    assert.equal(recommended.id, "route-b");
    assert.equal(recommended.status, "recommended");

    // Route A is fastest, but Route B is recommended
    const fastest = response.routes.find((r) => r.isFastest);
    assert.ok(fastest, "Fastest route must exist");
    assert.equal(fastest.id, "route-a");

    // Route B must have trade-offs calculated
    assert.equal(recommended.addedMinutesComparedToFastest, 12);
    assert.ok(recommended.coordinates && recommended.coordinates.length > 0);
  });

  await t.test("isDemoCorridor correctly identifies Guwahati-Shillong pairs", () => {
    assert.equal(isDemoCorridor("Guwahati", "Shillong"), true);
    assert.equal(isDemoCorridor("  guwahati  ", "shillong, meghalaya"), true);
    assert.equal(isDemoCorridor("Imphal", "Kohima"), false);
  });

  await t.test("formatEta handles hours and minutes accurately", () => {
    assert.equal(formatEta(45), "45m");
    assert.equal(formatEta(60), "1h 00m");
    assert.equal(formatEta(125), "2h 05m");
    assert.equal(formatEta(188), "3h 08m");
    assert.equal(formatEta(NaN), "--");
    assert.equal(formatEta(-10), "--");
  });

  await t.test("formatDistance formats with 1 decimal", () => {
    assert.equal(formatDistance(99.4), "99.4 km");
    assert.equal(formatDistance(100), "100.0 km");
    assert.equal(formatDistance(NaN), "-- km");
  });

  await t.test("formatRiskScore preserves null and never prints 0% for null", () => {
    assert.equal(formatRiskScore(15), "15%");
    assert.equal(formatRiskScore(0), "0%");
    assert.equal(formatRiskScore(null), "Not evaluated");
    assert.equal(formatRiskScore(undefined), "Not evaluated");
    assert.equal(formatRiskScore(NaN), "Not evaluated");
  });
});
