

import { useEffect, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

type Coordinate = [number, number];

type MapRoute = {
  id: string;
  distanceKm: number;
  durationMinutes: number;
  coordinates: Coordinate[];
};

type Place = {
  lat: number;
  lon: number;
  displayName: string;
};

type MapData = {
  origin: Place;
  destination: Place;
  routes: MapRoute[];
};

type LeafletMapProps = {
  origin: string;
  destination: string;
  hasRoutes: boolean;
  selectedRouteId: string | null;
};

const DEFAULT_CENTER: Coordinate = [25.85, 92.1];

const ROUTE_COLORS = [
  "#059669", // Route 1 - emerald
  "#2563eb", // Route 2 - blue
  "#ea580c", // Route 3 - orange
  "#dc2626", // Route 4 - red
  "#7c3aed", // Route 5 - violet
  "#0891b2", // Route 6 - cyan
  "#c026d3", // Route 7 - magenta
  "#65a30d", // Route 8 - lime
];

const ROUTE_DASHES = [
  undefined,
  "12 8",
  "3 7",
  "18 7 3 7",
  "8 5",
  "14 5 3 5",
  "5 5",
  "20 5 4 5",
];

function MapController({ data }: { data: MapData | null }) {
  const map = useMap();

  useEffect(() => {
    if (!data) return;

    const points: Coordinate[] = [
      [data.origin.lat, data.origin.lon],
      [data.destination.lat, data.destination.lon],
    ];

    data.routes.forEach((route) => points.push(...route.coordinates));

    if (points.length > 1) {
      map.fitBounds(points, { padding: [24, 24] });
    }
  }, [data, map]);

  return null;
}

export default function LeafletMap({
  origin,
  destination,
  hasRoutes,
  selectedRouteId,
}: LeafletMapProps) {
  const [data, setData] = useState<MapData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasRoutes || !origin.trim() || !destination.trim()) {
      setData(null);
      setError(null);
      return;
    }

    let cancelled = false;

    async function loadMapRoute() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/map-route", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ origin, destination }),
        });

        const result = (await response.json()) as MapData & {
          error?: string;
        };

        if (!response.ok) {
          throw new Error(result.error ?? "Unable to load road route.");
        }

        if (!cancelled) setData(result);
      } catch (mapError) {
        if (!cancelled) {
          setData(null);
          setError(
            mapError instanceof Error
              ? mapError.message
              : "Unable to load road route.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadMapRoute();

    return () => {
      cancelled = true;
    };
  }, [origin, destination, hasRoutes]);

  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={7}
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapController data={data} />

      {data ? (
        <>
          <CircleMarker
            center={[data.origin.lat, data.origin.lon]}
            radius={7}
            pathOptions={{
              color: "#0b2340",
              fillColor: "#ffffff",
              fillOpacity: 1,
              weight: 3,
            }}
          >
            <Popup>
              <strong>Origin</strong>
              <br />
              {data.origin.displayName}
            </Popup>
          </CircleMarker>

          <CircleMarker
            center={[data.destination.lat, data.destination.lon]}
            radius={7}
            pathOptions={{
              color: "#0b2340",
              fillColor: "#ffffff",
              fillOpacity: 1,
              weight: 3,
            }}
          >
            <Popup>
              <strong>Destination</strong>
              <br />
              {data.destination.displayName}
            </Popup>
          </CircleMarker>

          {data.routes
            .map((route, index) => ({ route, index }))
            .sort(({ route: a }, { route: b }) =>
              a.id === selectedRouteId ? 1 : b.id === selectedRouteId ? -1 : 0,
            )
            .map(({ route, index }) => {
              const selected = selectedRouteId === route.id;
              const routeColor = ROUTE_COLORS[index % ROUTE_COLORS.length];
              const dashArray = selected ? undefined : ROUTE_DASHES[index % ROUTE_DASHES.length];

              return (
                <Polyline
                  key={route.id}
                  positions={route.coordinates}
                  pathOptions={{
                    color: routeColor,
                    weight: selected ? 6 : 3,
                    opacity: 1,
                    dashArray,
                    lineCap: "butt",
                    lineJoin: "round",
                  }}
                />
              );
            })}
        </>
      ) : null}

      {loading ? (
        <div className="pointer-events-none absolute inset-0 z-[1000] flex items-center justify-center bg-white/25">
          <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm">
            Loading road route…
          </div>
        </div>
      ) : null}

      {!loading && error ? (
        <div className="pointer-events-none absolute inset-0 z-[1000] flex items-center justify-center bg-white/25">
          <div className="max-w-sm rounded-md border border-red-200 bg-white px-3 py-2 text-center text-xs text-red-800 shadow-sm">
            {error}
          </div>
        </div>
      ) : null}

      {!loading && !error && !hasRoutes ? (
        <div className="pointer-events-none absolute inset-0 z-[1000] flex items-center justify-center bg-white/15">
          <p className="rounded-md border border-slate-200 bg-white/95 px-3 py-2 text-xs text-slate-600 shadow-sm">
            Find a safe route to show road options.
          </p>
        </div>
      ) : null}
    </MapContainer>
  );
}
