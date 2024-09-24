import { APIRequestError } from "@/lib/error";

export default async function fetcher<JSON = any>(
  input: RequestInfo,
  init?: RequestInit
): Promise<JSON> {
  const res = await fetch(input, init);

  if (!res.ok) {
    throw new APIRequestError(res.statusText, res.status, res.statusText);
  }

  return res.json();
}
