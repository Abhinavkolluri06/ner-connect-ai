import type { Metadata } from "next";
import { Suspense } from "react";

import RoutePlanner from "@/components/RoutePlanner";

export const metadata: Metadata = {
  title: "Route Planner",
};

export default function RoutePlannerPage() {
  return (
    <Suspense fallback={null}>
      <RoutePlanner />
    </Suspense>
  );
}