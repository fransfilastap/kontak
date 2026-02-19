import { NextResponse, type NextRequest } from "next/server";
import { kontakClient } from "@/lib/kontak";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string; chatJid: string }> }
) {
  const { clientId, chatJid } = await params;
  try {
    const result = await kontakClient.markConversationRead(clientId, chatJid);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error marking conversation as read:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
