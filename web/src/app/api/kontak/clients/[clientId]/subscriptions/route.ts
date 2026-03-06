import { NextResponse, type NextRequest } from "next/server";
import { kontakClient } from "@/lib/kontak";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params;
  const headers = await getAuthHeaders(req);
  const response = await fetch(
    `${process.env.KONTAK_API_URL || "http://localhost:8080"}/admin/clients/${clientId}/subscriptions`,
    { headers }
  );
  const data = await response.json();
  return NextResponse.json(data);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params;
  const headers = await getAuthHeaders(req);
  const body = await req.json();
  const response = await fetch(
    `${process.env.KONTAK_API_URL || "http://localhost:8080"}/admin/clients/${clientId}/subscriptions`,
    {
      method: "PUT",
      headers,
      body: JSON.stringify(body),
    }
  );
  const data = await response.json();
  return NextResponse.json(data);
}

async function getAuthHeaders(req: NextRequest): Promise<Record<string, string>> {
  const { auth } = await import("@/auth");
  let session: any;
  if (typeof window !== "undefined") {
    const { getSession } = await import("next-auth/react");
    session = await getSession();
  } else {
    session = await auth();
  }
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }
  return headers;
}