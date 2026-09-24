import { NextResponse } from "next/server";

type KnownPlace = {
  name: string;
  lat: number;
  lon: number;
};

const KNOWN_NER_HUBS: KnownPlace[] = [
  { name: "Guwahati, Assam", lat: 26.1445, lon: 91.7362 },
  { name: "Shillong, Meghalaya", lat: 25.5788, lon: 91.8933 },
  { name: "Sohra / Cherrapunji, Meghalaya", lat: 25.2745, lon: 91.7362 },
  { name: "Dawki, Meghalaya", lat: 25.1848, lon: 92.0227 },
  { name: "Jowai, Meghalaya", lat: 25.4526, lon: 92.2036 },
  { name: "Tura, Meghalaya", lat: 25.5147, lon: 90.203 },
  { name: "Silchar, Assam", lat: 24.8333, lon: 92.7789 },
  { name: "Haflong, Assam", lat: 25.1697, lon: 93.0189 },
  { name: "Dimapur, Nagaland", lat: 25.8629, lon: 93.7531 },
  { name: "Kohima, Nagaland", lat: 25.6751, lon: 94.1086 },
  { name: "Imphal, Manipur", lat: 24.817, lon: 93.9368 },
  { name: "Aizawl, Mizoram", lat: 23.7271, lon: 92.7176 },
  { name: "Agartala, Tripura", lat: 23.8315, lon: 91.2868 },
  { name: "Itanagar, Arunachal Pradesh", lat: 27.0844, lon: 93.6053 },
  { name: "Gangtok, Sikkim", lat: 27.3389, lon: 88.6065 },
  { name: "Nongpoh, Meghalaya", lat: 25.9015, lon: 91.8805 },
  { name: "Tezpur, Assam", lat: 26.6338, lon: 92.7926 },
  { name: "Dibrugarh, Assam", lat: 27.4728, lon: 94.912 },
  { name: "Jorhat, Assam", lat: 26.7509, lon: 94.2037 },
];

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const latStr = searchParams.get("lat");
  const lonStr = searchParams.get("lon");

  if (!latStr || !lonStr) {
    return NextResponse.json(
      { error: "lat and lon query parameters are required" },
      { status: 400 },
    );
  }

  const lat = parseFloat(latStr);
  const lon = parseFloat(lonStr);

  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return NextResponse.json(
      { error: "Invalid numeric coordinates" },
      { status: 400 },
    );
  }

  // 1. Fast Regional Hub Proximity Check (< 8km)
  let closestHub: KnownPlace | null = null;
  let minDistance = Number.POSITIVE_INFINITY;

  for (const hub of KNOWN_NER_HUBS) {
    const dist = haversineDistanceKm(lat, lon, hub.lat, hub.lon);
    if (dist < minDistance) {
      minDistance = dist;
      closestHub = hub;
    }
  }

  if (closestHub && minDistance <= 8.0) {
    return NextResponse.json({
      name: closestHub.name.split(",")[0].trim(),
      fullName: closestHub.name,
      lat,
      lon,
      source: "regional_ner_registry",
      distanceKm: Math.round(minDistance * 10) / 10,
    });
  }

  // 2. Safe Fallback to OpenStreetMap Nominatim with bounded timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14`,
      {
        headers: {
          "User-Agent": "NER-Connect-AI-Logistics/2.0 (ner-connect.ai)",
          Accept: "application/json",
        },
        signal: controller.signal,
      },
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.display_name) {
        const parts = data.display_name.split(",").map((s: string) => s.trim());
        const conciseName = parts.slice(0, 2).join(", ");
        return NextResponse.json({
          name: conciseName,
          fullName: data.display_name,
          lat,
          lon,
          source: "nominatim",
        });
      }
    }
  } catch {
    // Graceful fallback to coordinate label on timeout or network block
  }

  // 3. Fallback Coordinate Label
  const coordLabel = `Location (${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E)`;
  return NextResponse.json({
    name: coordLabel,
    fullName: coordLabel,
    lat,
    lon,
    source: "coordinate_fallback",
  });
}
