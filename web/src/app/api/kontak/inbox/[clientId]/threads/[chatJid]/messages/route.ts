import { NextResponse, type NextRequest } from "next/server";
import { kontakClient } from "@/lib/kontak";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string; chatJid: string }> }
) {
  const { clientId, chatJid } = await params;
  const { searchParams } = new URL(req.url);
  const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined;
  const offset = searchParams.get("offset") ? Number(searchParams.get("offset")) : undefined;
  try {
    const messages = await kontakClient.getThreadMessages(clientId, chatJid, { limit, offset });
    return NextResponse.json(messages);
  } catch (error) {
    console.error("Error fetching thread messages:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
