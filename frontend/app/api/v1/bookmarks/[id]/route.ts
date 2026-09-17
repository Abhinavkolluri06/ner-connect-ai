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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const userID = await getUserID();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-User-ID": userID,
  };
  if (API_TOKEN) {
    headers["Authorization"] = `Bearer ${API_TOKEN}`;
  }

  try {
    const resp = await fetch(`${BACKEND_URL}/api/v1/bookmarks/${encodeURIComponent(id)}`, { headers });
    const data = await resp.json();
    return NextResponse.json(data, { status: resp.status });
  } catch {
    return NextResponse.json(
      { error: { code: "BOOKMARKS_UNAVAILABLE", message: "Bookmark service unavailable." } },
      { status: 503 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const userID = await getUserID();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-User-ID": userID,
  };
  if (API_TOKEN) {
    headers["Authorization"] = `Bearer ${API_TOKEN}`;
  }

  try {
    const resp = await fetch(`${BACKEND_URL}/api/v1/bookmarks/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers,
    });
    const data = await resp.json();
    return NextResponse.json(data, { status: resp.status });
  } catch {
    return NextResponse.json(
      { error: { code: "DELETE_FAILED", message: "Failed to delete bookmark." } },
      { status: 500 },
    );
  }
}
