// Generated client configuration - import this before using the SDK
import { createConfig } from "./client";
import type { ClientOptions } from "./client";

const baseUrl = process.env.NEXT_PUBLIC_KONTAK_API_URL || "http://localhost:8080";

export const kontakConfig = createConfig<ClientOptions>({
  baseUrl,
});
