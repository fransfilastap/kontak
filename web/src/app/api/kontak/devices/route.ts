import { NextResponse, type NextRequest } from "next/server";
import { kontakClient } from "@/lib/kontak";

export async function GET(req: NextRequest) {
  const devices = await kontakClient.getDevices();
  return NextResponse.json(devices);
}
