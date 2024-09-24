import { NextApiRequest } from "next";
import { NextResponse } from "next/server";
import { kontakClient } from "@/lib/kontak";

export async function GET(
  req: NextApiRequest,

  { params: { id } }: { params: { id: string } }
) {
  const response = await kontakClient.getClientQRC(id);

  return NextResponse.json(response);
}
