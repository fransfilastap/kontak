import { NextResponse, type NextRequest } from "next/server";
import { kontakClient } from "@/lib/kontak";

export async function POST(req: NextRequest) {
  try {
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
