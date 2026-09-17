import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const BACKEND_URL = process.env.BACKEND_API_URL || "http://127.0.0.1:8080";
const API_TOKEN = process.env.API_TOKEN || "";

// Map frontend UI names to canonical backend enum values
function normalizeRequest(raw: any) {
  const vehicleMap: Record<string, string> = {
    truck: "truck",
    van: "truck",
    "light vehicle": "car",
    car: "car",
    motorcycle: "motorcycle",
    ambulance: "ambulance",
  };

  const cargoMap: Record<string, string> = {
    "medical supplies": "medical_supplies",
    "food & relief": "food",
    food: "food",
    fuel: "general",
    "general cargo": "general",
    general: "general",
    passengers: "passengers",
    emergency_equipment: "emergency_equipment",
    "emergency equipment": "emergency_equipment",
  };

  const priorityMap: Record<string, string> = {
    emergency: "emergency",
    high: "fastest",
    fastest: "fastest",
    standard: "normal",
    normal: "normal",
    safest: "safest",
  };

  const vehicleKey = String(raw.vehicle || "car").toLowerCase().trim();
  const cargoKey = String(raw.cargo || "general").toLowerCase().trim();
  const priorityKey = String(raw.priority || "normal").toLowerCase().trim();

  return {
    origin: String(raw.origin || "").trim(),
    destination: String(raw.destination || "").trim(),
    vehicle: vehicleMap[vehicleKey] || "car",
    cargo: cargoMap[cargoKey] || "general",
    priority: priorityMap[priorityKey] || "normal",
    vehicle_dimensions: raw.vehicle_dimensions || undefined,
  };
}

export async function POST(request: Request) {
  try {
    let userID = "anonymous";
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.id) {
        userID = user.id;
      }
    } catch {
      // Unauthenticated session or local dev without supabase cookie
    }

    const rawBody = await request.json();
    const payload = normalizeRequest(rawBody);

    if (!payload.origin || !payload.destination) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_ROUTE_REQUEST",
            message: "Origin and destination are required.",
          },
        },
        { status: 400 },
      );
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-User-ID": userID,
    };
    if (API_TOKEN) {
      headers["Authorization"] = `Bearer ${API_TOKEN}`;
    }

    const targetUrl = `${BACKEND_URL}/api/v1/routes/analyze`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const resp = await fetch(targetUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const data = await resp.json();
      return NextResponse.json(data, { status: resp.status });
    } catch (fetchErr: any) {
      clearTimeout(timeout);
      const isTimeout = fetchErr.name === "AbortError";
      return NextResponse.json(
        {
          error: {
            code: isTimeout ? "ANALYSIS_TIMEOUT" : "ROUTING_PROVIDER_UNAVAILABLE",
            message: isTimeout
              ? "Route analysis exceeded deadline."
              : "Could not reach the route analysis service.",
          },
        },
        { status: isTimeout ? 504 : 503 },
      );
    }
  } catch (err: any) {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: err.message || "Failed to process route analysis request.",
        },
      },
      { status: 500 },
    );
  }
}
