"use server";

import { actionClient } from "@/lib/safe-action";
import { loginSchema } from "./zod-schema";
import { signIn } from "@/auth";

export const loginAction = actionClient
  .schema(loginSchema)
  .action(async ({ parsedInput: { email, password } }) => {
      console.log("loginAction", email, password);
    await signIn("credentials", {
      redirect: true,
      email,
      password,
      redirectTo: "/clients",
    });
  });
