"use server";

import { actionClient } from "@/lib/safe-action";
import deviceSchema from "@/app/(admin)/register-device/zod";
import { kontakClient } from "@/lib/kontak";

export const registerDevice = actionClient
  .schema(deviceSchema)
  .action(async ({ parsedInput: { name, mobile_number } }) => {
    try {
      const response = await kontakClient.registerDevice({
        name,
        mobile_number,
      });
      return response;
    } catch (error) {
      console.error("Error registering device:", error);
      return { failure: "Failed to register device" };
    }
  });
