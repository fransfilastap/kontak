import { actionClient } from "@/lib/safe-action";
import { disconnectDeviceSchema } from "../../(admin)/clients/zod-schema";
import { kontakClient } from "@/lib/kontak";

const disconnectDevice = actionClient.schema(disconnectDeviceSchema);

export const disconnectDeviceAction = disconnectDevice.action(
  async ({ parsedInput }) => {
    const response = await kontakClient.disconnectDevice(parsedInput.clientId);
    return {
      serverError: response.server_error,
      message: response.message,
    };
  }
);
