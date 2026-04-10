import { NextResponse, type NextRequest } from "next/server";
import { requireKontakSession } from "@/lib/api-session";

const BASE_URL = (process.env.KONTAK_API_URL || "http://localhost:8080").replace(
  /\/v1\/?$/,
  ""
);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params;
  const authz = await requireKontakSession();
  if (!authz.ok) return authz.response;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${authz.accessToken}`,
  };
  const response = await fetch(
    `${BASE_URL}/admin/clients/${clientId}/subscriptions`,
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
  const authz = await requireKontakSession();
  if (!authz.ok) return authz.response;
  const body = await req.json();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${authz.accessToken}`,
  };
  const response = await fetch(
    `${BASE_URL}/admin/clients/${clientId}/subscriptions`,
    {
      method: "PUT",
      headers,
      body: JSON.stringify(body),
    }
  );
  const data = await response.json();
  return NextResponse.json(data);
}
