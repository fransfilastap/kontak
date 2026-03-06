import { NextResponse, type NextRequest } from "next/server";
import { kontakClient } from "@/lib/kontak";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    console.log("DELETE api-key route, id:", id, "raw params:", params);
    if (!id) {
      console.error("No id in params:", params);
      return NextResponse.json({ error: "Missing API key ID" }, { status: 400 });
    }
    await kontakClient.deleteAPIKey(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting API key:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}