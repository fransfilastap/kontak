import { NextResponse, type NextRequest } from "next/server";
import { kontakClient } from "@/lib/kontak";
import { requireKontakSession } from "@/lib/api-session";

export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get("clientId");
  if (!clientId || typeof clientId !== "string") {
    return new Response(null, {
      status: 400,
      statusText: "Bad Request",
    });
  }

  try {
    const authz = await requireKontakSession();
    if (!authz.ok) return authz.response;
    const status = await kontakClient.getConnectionStatus(clientId);
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
