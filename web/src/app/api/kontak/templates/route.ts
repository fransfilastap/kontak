import { NextResponse, type NextRequest } from "next/server";
import { kontakClient } from "@/lib/kontak";

export async function GET(req: NextRequest) {
  const templates = await kontakClient.getTemplates();
  return NextResponse.json(templates);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const template = await kontakClient.createTemplate(body);
  return NextResponse.json(template);
}
