import * as sdk from "@/types/generated/sdk.gen";

/** Login against the Kontak Go API (no dependency on auth/session). */
export async function loginKontakApi(email: string, password: string) {
  const result = await sdk.postLogin({
    body: { email, password },
  });
  return result?.data;
}
