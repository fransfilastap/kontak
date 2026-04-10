import { NextRequest, NextResponse } from "next/server";
import { kontakClient } from "@/lib/kontak";
import { requireKontakSession } from "@/lib/api-session";

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const authz = await requireKontakSession();
  if (!authz.ok) return authz.response;
  const params = await props.params;
  const { id } = params;
  const response = await kontakClient.getClientQRC(id);
  return NextResponse.json(response);
}
