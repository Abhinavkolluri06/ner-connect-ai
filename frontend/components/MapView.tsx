"use client";

import dynamic from "next/dynamic";
import type { RouteOption } from "@/lib/types";

const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
});

type MapViewProps = {
  origin: string;
  destination: string;
  routes: RouteOption[];
  selectedRouteId: string | null;
};

export default function MapView({
  origin,
  destination,
  routes,
  selectedRouteId,
}: MapViewProps) {
  return (
    <section className="self-start overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex h-12 items-center justify-between border-b border-slate-200 px-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-navy-900">
            Live Route Map
          </h2>

          {routes.length > 0 ? (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
              {routes.length} routes
            </span>
          ) : null}
        </div>

        {routes.length > 0 ? (
          <div className="hidden items-center gap-3 text-[10px] font-medium text-slate-500 xl:flex">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-5 rounded-full bg-emerald-600" />
              Recommended
            </span>

            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-5 rounded-full bg-blue-600" />
              Alternative
            </span>

            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-5 rounded-full bg-orange-500" />
              Other
            </span>
          </div>
        ) : null}
      </div>

      <div className="relative h-[27rem] w-full overflow-hidden">
        <LeafletMap
          origin={origin}
          destination={destination}
          hasRoutes={routes.length > 0}
          selectedRouteId={selectedRouteId}
        />
      </div>
    </section>
  );
}