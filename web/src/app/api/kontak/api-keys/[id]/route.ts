import { NextResponse, type NextRequest } from "next/server";
import { kontakClient } from "@/lib/kontak";
import { requireKontakSession } from "@/lib/api-session";

export async function DELETE(
  _req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  try {
    const authz = await requireKontakSession();
    if (!authz.ok) return authz.response;
    if (!id) {
      return NextResponse.json({ error: "Missing API key ID" }, { status: 400 });
    }
    await kontakClient.deleteAPIKey(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting API key:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
