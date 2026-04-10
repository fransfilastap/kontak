import { authClient } from "@/lib/auth-client";
import { createKontakClient } from "@/lib/kontak-shared";

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await authClient.getSession();
  const accessToken =
    (data?.session as { access_token?: string } | undefined)?.access_token ??
    null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }
  return headers;
}

export const kontakClient = createKontakClient(getAuthHeaders);
