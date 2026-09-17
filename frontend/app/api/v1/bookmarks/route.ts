import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const BACKEND_URL = process.env.BACKEND_API_URL || "http://127.0.0.1:8080";
const API_TOKEN = process.env.API_TOKEN || "";

async function getUserID(): Promise<string> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id || "anonymous";
  } catch {
    return "anonymous";
  }
}

export async function GET(request: Request) {
  const userID = await getUserID();
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get("limit") || "20";
  const offset = searchParams.get("offset") || "0";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-User-ID": userID,
  };
  if (API_TOKEN) {
    headers["Authorization"] = `Bearer ${API_TOKEN}`;
  }

  try {
    const resp = await fetch(
      `${BACKEND_URL}/api/v1/bookmarks?limit=${encodeURIComponent(limit)}&offset=${encodeURIComponent(offset)}`,
      { headers },
    );
    const data = await resp.json();
    return NextResponse.json(data, { status: resp.status });
  } catch {
    return NextResponse.json(
      { error: { code: "BOOKMARKS_UNAVAILABLE", message: "Bookmark service is unavailable." } },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  const userID = await getUserID();
  const body = await request.json();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-User-ID": userID,
  };
  if (API_TOKEN) {
    headers["Authorization"] = `Bearer ${API_TOKEN}`;
  }

  try {
    const resp = await fetch(`${BACKEND_URL}/api/v1/bookmarks`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const data = await resp.json();
    return NextResponse.json(data, { status: resp.status });
  } catch {
    return NextResponse.json(
      { error: { code: "DATABASE_ERROR", message: "Failed to reach bookmark service." } },
      { status: 500 },
    );
  }
}
