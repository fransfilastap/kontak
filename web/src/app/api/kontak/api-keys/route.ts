import { NextResponse, type NextRequest } from "next/server";
import { kontakClient } from "@/lib/kontak";

export async function GET(req: NextRequest) {
  try {
    const data = await kontakClient.getAPIKeys();
    console.log("GET /api/kontak/api-keys returning:", data);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching API keys:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = await kontakClient.createAPIKey(body.name);
    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error("Error creating API key:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}