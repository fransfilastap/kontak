import { NextResponse, type NextRequest } from "next/server";
import { requireKontakSession } from "@/lib/api-session";

const BASE_URL = (process.env.KONTAK_API_URL ?? "http://localhost:8080").replace(/\/v1\/?$/, "");

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string; chatJid: string }> }
) {
  const { clientId, chatJid } = await params;
  try {
    const authz = await requireKontakSession();
    if (!authz.ok) return authz.response;
    const formData = await req.formData();

    const headers: HeadersInit = {
      Authorization: `Bearer ${authz.accessToken}`,
    };

    const response = await fetch(
      `${BASE_URL}/admin/inbox/${clientId}/threads/${encodeURIComponent(chatJid)}/send-media`,
      {
        method: "POST",
        headers,
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Failed to send media" }));
      return NextResponse.json(errorData, { status: response.status });
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error sending media:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
