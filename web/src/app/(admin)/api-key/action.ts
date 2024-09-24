"use server";

import { actionClient } from "@/lib/safe-action";
import { kontakClient } from "@/lib/kontak";

const generateApiKeyAction = actionClient.action(async () => {
  const apiKey = await kontakClient.generateAPIKey();
  return apiKey.api_key;
});

export { generateApiKeyAction };
