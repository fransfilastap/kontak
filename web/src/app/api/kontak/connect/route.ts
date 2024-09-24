import { NextResponse, type NextRequest } from "next/server";
import { kontakClient } from "@/lib/kontak";

export async function POST(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get("clientId");
  if (!clientId || typeof clientId !== "string") {
    return new Response(null, {
      status: 400,
      statusText: "Bad Request",
    });
  }

  try {
    const status = await kontakClient.connectDevice(clientId);
    return NextResponse.json(status);
  } catch (error) {
    console.error("Error fetching client status:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      {
        status: 500,
      }
    );
  }
}
