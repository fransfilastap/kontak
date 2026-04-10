import { NextResponse, type NextRequest } from "next/server";
import { kontakClient } from "@/lib/kontak";
import { requireKontakSession } from "@/lib/api-session";

export async function GET(_req: NextRequest) {
  const authz = await requireKontakSession();
  if (!authz.ok) return authz.response;
  const devices = await kontakClient.getDevices();
  return NextResponse.json(devices);
}
