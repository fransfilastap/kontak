import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";

const BASE_URL = (process.env.KONTAK_API_URL ?? "http://localhost:8080").replace(/\/v1\/?$/, "");

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params;
  try {
    const session = await auth();
    const body = await req.json();

    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }

    const response = await fetch(
      `${BASE_URL}/admin/inbox/${clientId}/threads/send`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Failed to send message" }));
      return NextResponse.json(errorData, { status: response.status });
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error sending new message:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
