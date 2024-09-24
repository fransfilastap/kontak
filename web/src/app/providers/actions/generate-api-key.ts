import { actionClient } from "@/lib/safe-action";
import { generateAPIKeySchema } from "../../(admin)/clients/zod-schema";
import { kontakClient } from "@/lib/kontak";

export const generateAPIKeyAction = actionClient.action(async () => {
  return await kontakClient.generateAPIKey();
});
