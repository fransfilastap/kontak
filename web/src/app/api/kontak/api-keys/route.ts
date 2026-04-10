import { NextResponse, type NextRequest } from "next/server";
import { kontakClient } from "@/lib/kontak";
import { requireKontakSession } from "@/lib/api-session";

export async function GET(req: NextRequest) {
  try {
    const authz = await requireKontakSession();
    if (!authz.ok) return authz.response;
    const data = await kontakClient.getAPIKeys();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching API keys:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authz = await requireKontakSession();
    if (!authz.ok) return authz.response;
    const body = await req.json();
    const data = await kontakClient.createAPIKey(body.name);
    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error("Error creating API key:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}