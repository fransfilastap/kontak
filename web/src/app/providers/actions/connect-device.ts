import { actionClient } from "@/lib/safe-action";
import { connectDeviceSchema } from "../../(admin)/clients/zod-schema";
import { kontakClient } from "@/lib/kontak";

const connectDevice = actionClient.schema(connectDeviceSchema);

export const connectDeviceAction = connectDevice.action(
  async ({ parsedInput }) => {
    const response = await kontakClient.connectDevice(parsedInput.clientId);
    return {
      serverError: response.server_error,
      message: response.message,
    };
  }
);
