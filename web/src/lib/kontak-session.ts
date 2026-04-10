import "server-only";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";

/** Server-only session with the Kontak API bearer token from Better Auth. */
export async function getKontakSession() {
  const s = await auth.api.getSession({ headers: await headers() });
  if (!s?.session) return null;
  const access_token = s.session.access_token;
  if (typeof access_token !== "string" || !access_token) return null;
  return { access_token, user: s.user };
}
