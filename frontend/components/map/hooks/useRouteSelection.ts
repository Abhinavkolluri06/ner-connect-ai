import { useMemo } from "react";
import type { RouteOption } from "@/lib/types";

export type SemanticRouteColor = {
  primary: string;
  label: string;
  isRecommended: boolean;
};

export const SEMANTIC_PALETTE = {
  recommended: "#0A9169", // emerald-600
  alternativeBlue: "#2563EB", // blue-600
  alternativeAmber: "#D97706", // amber-600
  alternativeViolet: "#7C3AED", // violet-600
  higherRisk: "#DC2626", // red-600
  muted: "#64748B", // slate-500
};

export function getSemanticRouteColor(
  route: RouteOption,
  index: number,
  recommendedRouteId?: string | null,
): SemanticRouteColor {
  const isRecommended =
    route.isRecommended ||
    route.id === recommendedRouteId ||
    route.status === "recommended";

  if (isRecommended) {
    return {
      primary: SEMANTIC_PALETTE.recommended,
      label: "Recommended",
      isRecommended: true,
    };
  }

  if (route.status === "higher_risk" || (route.overallRiskScore && route.overallRiskScore > 0.65)) {
    return {
      primary: SEMANTIC_PALETTE.higherRisk,
      label: "Higher Exposure",
      isRecommended: false,
    };
  }

  if (route.isFastest || index === 0) {
    return {
      primary: SEMANTIC_PALETTE.alternativeBlue,
      label: "Fastest / Primary Alt",
      isRecommended: false,
    };
  }

  if (index === 1) {
    return {
      primary: SEMANTIC_PALETTE.alternativeAmber,
      label: "Alternative Corridor",
      isRecommended: false,
    };
  }

  return {
    primary: SEMANTIC_PALETTE.alternativeViolet,
    label: "Alternate Route",
    isRecommended: false,
  };
}

export function useRouteSelection(
  routes: RouteOption[],
  selectedRouteId: string | null,
  recommendedRouteId?: string | null,
) {
  const selectedRoute = useMemo(() => {
    if (!routes.length) return null;
    return (
      routes.find((r) => r.id === selectedRouteId) ||
      routes.find((r) => r.id === recommendedRouteId) ||
      routes.find((r) => r.isRecommended) ||
      routes[0]
    );
  }, [routes, selectedRouteId, recommendedRouteId]);

  const routeStyles = useMemo(() => {
    return routes.map((route, idx) => ({
      route,
      colorMeta: getSemanticRouteColor(route, idx, recommendedRouteId),
      isSelected: route.id === selectedRoute?.id,
    }));
  }, [routes, selectedRoute?.id, recommendedRouteId]);

  return {
    selectedRoute,
    routeStyles,
  };
}
