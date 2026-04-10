import { NextResponse, type NextRequest } from "next/server";
import { kontakClient } from "@/lib/kontak";
import { requireKontakSession } from "@/lib/api-session";

export async function POST(req: NextRequest) {
  try {
    const authz = await requireKontakSession();
    if (!authz.ok) return authz.response;
    const apiKey = await kontakClient.generateAPIKey();
    return NextResponse.json({ apiKey });
  } catch (error) {
    console.error("Error generating API key:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      {
        status: 500,
      }
    );
  }
}
