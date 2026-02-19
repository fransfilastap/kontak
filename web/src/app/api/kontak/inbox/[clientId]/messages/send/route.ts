import { NextResponse, type NextRequest } from "next/server";
import { kontakClient } from "@/lib/kontak";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params;
  try {
    const body = await req.json();
    const result = await kontakClient.sendNewInboxMessage(clientId, body.to, body.text);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error sending new message:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
