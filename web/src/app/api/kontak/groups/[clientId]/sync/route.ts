import { NextResponse, type NextRequest } from "next/server";
import { kontakClient } from "@/lib/kontak";
import { requireKontakSession } from "@/lib/api-session";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params;
  try {
    const authz = await requireKontakSession();
    if (!authz.ok) return authz.response;
    const result = await kontakClient.syncGroups(clientId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error syncing groups:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
