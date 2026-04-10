import { auth } from "@/auth";
import { NextResponse } from "next/server";

export type KontakSessionResult =
  | { ok: true; accessToken: string }
  | { ok: false; response: NextResponse };

/** Single `auth()` call for BFF routes; returns 401 when there is no API JWT. */
export async function requireKontakSession(): Promise<KontakSessionResult> {
  const session = await auth();
  if (!session?.access_token) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { ok: true, accessToken: session.access_token };
}
