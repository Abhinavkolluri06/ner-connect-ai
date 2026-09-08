import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { error: "You must be signed in." },
      { status: 401 },
    );
  }

  const { data, error } = await supabase
    .from("route_plans")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ routePlan: data });
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { error: "You must be signed in." },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();

    const {
      origin,
      destination,
      vehicle,
      cargo,
      priority,
      result,
      selectedRoute,
    } = body;

    if (!origin || !destination || !result) {
      return NextResponse.json(
        { error: "Missing route plan data." },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("route_plans")
      .insert({
        user_id: user.id,
        origin,
        destination,
        vehicle,
        cargo,
        priority,
        routes: result.routes ?? [],
        recommended_route: result.recommendedRouteId ?? null,
        selected_route:
          selectedRoute ?? result.recommendedRouteId ?? null,
        result,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { routePlan: data },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid route plan data." },
      { status: 400 },
    );
  }
}