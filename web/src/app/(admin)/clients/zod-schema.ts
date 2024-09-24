import { z } from "zod";

const connectDeviceSchema = z.object({
  clientId: z.string(),
});

const disconnectDeviceSchema = z.object({
  clientId: z.string(),
});

const generateAPIKeySchema = z.object({
  userId: z.string(),
});

export { connectDeviceSchema, disconnectDeviceSchema, generateAPIKeySchema };
