import { NextResponse, type NextRequest } from "next/server";
import { kontakClient } from "@/lib/kontak";
import { requireKontakSession } from "@/lib/api-session";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params;
  try {
    const authz = await requireKontakSession();
    if (!authz.ok) return authz.response;
    const groups = await kontakClient.getGroups(clientId);
    return NextResponse.json(groups);
  } catch (error) {
    console.error("Error fetching groups:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
