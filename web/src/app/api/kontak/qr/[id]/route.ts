import {NextRequest, NextResponse} from "next/server";
import { kontakClient } from "@/lib/kontak";

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;

  const {
    id
  } = params;

  const response = await kontakClient.getClientQRC(id);

  return NextResponse.json(response);
}
