import "server-only";

import { getKontakSession } from "@/lib/kontak-session";
import { createKontakClient } from "@/lib/kontak-shared";

async function getAuthHeaders(): Promise<Record<string, string>> {
  const session = await getKontakSession();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }
  return headers;
}

export const kontakClient = createKontakClient(getAuthHeaders);
