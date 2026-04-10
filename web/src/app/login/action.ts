"use server";

import { actionClient } from "@/lib/safe-action";
import { loginSchema } from "./zod-schema";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { isAPIError } from "better-auth/api";

export const loginAction = actionClient
  .schema(loginSchema)
  .action(async ({ parsedInput: { email, password } }) => {
    try {
      await auth.api.signInKontak({
        body: { email, password },
        headers: await headers(),
      });
    } catch (e) {
      if (isAPIError(e)) {
        throw new Error("Invalid email or password");
      }
      throw e;
    }
    redirect("/clients");
  });
