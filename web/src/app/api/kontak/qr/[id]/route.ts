import {NextRequest, NextResponse} from "next/server";
import { kontakClient } from "@/lib/kontak";

export async function GET(
  req: NextRequest,

  { params: { id } }: { params: { id: string } }
) {
  const response = await kontakClient.getClientQRC(id);

  return NextResponse.json(response);
}
