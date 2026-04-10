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
    const contacts = await kontakClient.getContacts(clientId);
    return NextResponse.json(contacts);
  } catch (error) {
    console.error("Error fetching contacts:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
