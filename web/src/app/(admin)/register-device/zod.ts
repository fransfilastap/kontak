import * as z from "zod";

const deviceSchema = z.object({
  name: z.string(),
  mobile_number: z
    .string()
    .regex(/^\d+$/, "Phone number should contain digits only"),
});

export default deviceSchema;
