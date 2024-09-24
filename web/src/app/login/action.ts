"use server";

import { actionClient } from "@/lib/safe-action";
import { loginSchema } from "./zod-schema";
import { signIn } from "@/auth";

export const loginAction = actionClient
  .schema(loginSchema)
  .action(async ({ parsedInput: { username, password } }) => {
    await signIn("credentials", {
      redirect: true,
      username,
      password,
      redirectTo: "/clients",
    });
  });
