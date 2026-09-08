import { NextResponse } from "next/server";

type Place = {
  lat: number;
  lon: number;
  displayName: string;
};

type OsrmRoute = {
  distance: number;
  duration: number;
  geometry?: {
    coordinates: Array<[number, number]>;
  };
};

type OsrmResponse = {
  code: string;
  routes?: OsrmRoute[];
};

const knownPlaces: Record<string, Place> = {
  guwahati: {
    lat: 26.1445,
    lon: 91.7362,
    displayName: "Guwahati, Assam",
  },
  shillong: {
    lat: 25.5788,
    lon: 91.8933,
    displayName: "Shillong, Meghalaya",
  },
  cherrapunji: {
    lat: 25.2745,
    lon: 91.7362,
    displayName: "Cherrapunji, Meghalaya",
  },
  sohra: {
    lat: 25.2745,
    lon: 91.7362,
    displayName: "Sohra, Meghalaya",
  },
  imphal: {
    lat: 24.817,
    lon: 93.9368,
    displayName: "Imphal, Manipur",
  },
  kohima: {
    lat: 25.6751,
    lon: 94.1086,
    displayName: "Kohima, Nagaland",
  },
  agartala: {
    lat: 23.8315,
    lon: 91.2868,
    displayName: "Agartala, Tripura",
  },
  aizawl: {
    lat: 23.7271,
    lon: 92.7176,
    displayName: "Aizawl, Mizoram",
  },
  gangtok: {
    lat: 27.3389,
    lon: 88.6065,
    displayName: "Gangtok, Sikkim",
  },
  itanagar: {
    lat: 27.0844,
    lon: 93.6053,
    displayName: "Itanagar, Arunachal Pradesh",
  },
  dimapur: {
    lat: 25.8629,
    lon: 93.7531,
    displayName: "Dimapur, Nagaland",
  },
  silchar: {
    lat: 24.8333,
    lon: 92.7789,
    displayName: "Silchar, Assam",
  },
  tura: {
    lat: 25.5147,
    lon: 90.203,
    displayName: "Tura, Meghalaya",
  },
};

function normalise(value: string) {
  return value.trim().toLowerCase();
}

async function geocodePlace(query: string): Promise<Place | null> {
  const known = knownPlaces[normalise(query)];

  if (known) {
    return known;
  }

  const url = new URL(
    "https://nominatim.openstreetmap.org/search",
  );

  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "in");

  const response = await fetch(url, {
    headers: {
      "User-Agent": "NER-Connect-AI/0.1 (SIH 2026 demo)",
    },
    next: {
      revalidate: 86400,
    },
  });

  if (!response.ok) {
    return null;
  }

  const results = (await response.json()) as Array<{
    lat: string;
    lon: string;
    display_name: string;
  }>;

  const result = results[0];

  if (!result) {
    return null;
  }

  return {
    lat: Number(result.lat),
    lon: Number(result.lon),
    displayName: result.display_name,
  };
}

/**
 * Creates a waypoint around the route midpoint.
 *
 * offset:
 *   0.25 = small detour
 *   0.45 = medium detour
 *   0.7  = larger detour
 *
 * direction:
 *   1  = one side of the corridor
 *   -1 = opposite side
 */
function createDetourPoint(
  origin: Place,
  destination: Place,
  direction: 1 | -1,
  offset: number,
): [number, number] {
  const midLat = (origin.lat + destination.lat) / 2;
  const midLon = (origin.lon + destination.lon) / 2;

  const latDifference = destination.lat - origin.lat;
  const lonDifference = destination.lon - origin.lon;

  const length = Math.sqrt(
    latDifference * latDifference +
      lonDifference * lonDifference,
  );

  if (length === 0) {
    return [midLat, midLon];
  }

  const perpendicularLat = -lonDifference / length;
  const perpendicularLon = latDifference / length;

  return [
    midLat + perpendicularLat * offset * direction,
    midLon + perpendicularLon * offset * direction,
  ];
}

async function requestOsrmRoute(
  origin: Place,
  destination: Place,
  waypoint?: [number, number],
): Promise<OsrmRoute | null> {
  const coordinates = waypoint
    ? [
        `${origin.lon},${origin.lat}`,
        `${waypoint[1]},${waypoint[0]}`,
        `${destination.lon},${destination.lat}`,
      ].join(";")
    : [
        `${origin.lon},${origin.lat}`,
        `${destination.lon},${destination.lat}`,
      ].join(";");

  const routeUrl =
    `https://router.project-osrm.org/route/v1/driving/${coordinates}` +
    "?alternatives=3&steps=false&geometries=geojson&overview=full";

  const response = await fetch(routeUrl, {
    next: {
      revalidate: 300,
    },
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as OsrmResponse;

  if (data.code !== "Ok" || !data.routes?.length) {
    return null;
  }

  return data.routes[0];
}

function routeSignature(route: OsrmRoute) {
  const coordinates = route.geometry?.coordinates ?? [];

  if (!coordinates.length) {
    return "";
  }

  const sampleIndexes = [
    0.2,
    0.4,
    0.6,
    0.8,
  ];

  return sampleIndexes
    .map((position) => {
      const coordinate =
        coordinates[
          Math.min(
            coordinates.length - 1,
            Math.floor(coordinates.length * position),
          )
        ];

      if (!coordinate) {
        return "";
      }

      const [lon, lat] = coordinate;

      return `${lon.toFixed(3)},${lat.toFixed(3)}`;
    })
    .join("|");
}

function formatRoute(route: OsrmRoute, index: number) {
  return {
    id: `route-${index + 1}`,
    distanceKm:
      Math.round((route.distance / 1000) * 10) / 10,
    durationMinutes: Math.round(route.duration / 60),
    coordinates:
      route.geometry?.coordinates.map(
        ([lon, lat]) => [lat, lon] as [number, number],
      ) ?? [],
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      origin?: string;
      destination?: string;
    };

    const originQuery = body.origin?.trim();
    const destinationQuery = body.destination?.trim();

    if (!originQuery || !destinationQuery) {
      return NextResponse.json(
        {
          error: "Origin and destination are required.",
        },
        { status: 400 },
      );
    }

    const origin = await geocodePlace(originQuery);

    if (!origin) {
      return NextResponse.json(
        {
          error: `Could not locate "${originQuery}".`,
        },
        { status: 404 },
      );
    }

    const destination = await geocodePlace(
      destinationQuery,
    );

    if (!destination) {
      return NextResponse.json(
        {
          error: `Could not locate "${destinationQuery}".`,
        },
        { status: 404 },
      );
    }

    /*
     * Generate geographically different candidate corridors.
     *
     * The frontend does not assume a fixed number of routes.
     * Every unique route returned here is passed to the frontend.
     *
     * The eventual routing backend should replace this temporary
     * waypoint strategy with proper alternative/k-shortest routing.
     */
    const candidates: Array<[number, number] | undefined> = [
      undefined,

      createDetourPoint(origin, destination, 1, 0.25),
      createDetourPoint(origin, destination, -1, 0.25),

      createDetourPoint(origin, destination, 1, 0.45),
      createDetourPoint(origin, destination, -1, 0.45),

      createDetourPoint(origin, destination, 1, 0.7),
      createDetourPoint(origin, destination, -1, 0.7),
    ];

    const candidateRoutes = await Promise.all(
      candidates.map((waypoint) =>
        requestOsrmRoute(
          origin,
          destination,
          waypoint,
        ),
      ),
    );

    const validRoutes = candidateRoutes.filter(
      (route): route is OsrmRoute => route !== null,
    );

    const uniqueRoutes: OsrmRoute[] = [];

    for (const route of validRoutes) {
      const signature = routeSignature(route);

      if (!signature) {
        continue;
      }

      const alreadyExists = uniqueRoutes.some(
        (existingRoute) =>
          routeSignature(existingRoute) === signature,
      );

      if (!alreadyExists) {
        uniqueRoutes.push(route);
      }
    }

    /*
     * No .slice(0, 3).
     *
     * Every unique candidate route is returned.
     */
    const routes = uniqueRoutes.map((route, index) =>
      formatRoute(route, index),
    );

    if (!routes.length) {
      return NextResponse.json(
        {
          error:
            "No road route was found between these locations.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      origin,
      destination,
      routes,
    });
  } catch {
    return NextResponse.json(
      {
        error: "Unable to calculate the map route.",
      },
      { status: 500 },
    );
  }
}