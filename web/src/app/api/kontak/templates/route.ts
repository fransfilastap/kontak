import { NextResponse, type NextRequest } from "next/server";
import { kontakClient } from "@/lib/kontak";
import { requireKontakSession } from "@/lib/api-session";

export async function GET(_req: NextRequest) {
  const authz = await requireKontakSession();
  if (!authz.ok) return authz.response;
  const templates = await kontakClient.getTemplates();
  return NextResponse.json(templates);
}

export async function POST(req: NextRequest) {
  const authz = await requireKontakSession();
  if (!authz.ok) return authz.response;
  const body = await req.json();
  const template = await kontakClient.createTemplate(body);
  return NextResponse.json(template);
}
