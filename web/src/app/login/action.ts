"use server";

import { actionClient } from "@/lib/safe-action";
import { loginSchema } from "./zod-schema";
import { signIn } from "@/auth";
import { redirect } from "next/navigation";

export const loginAction = actionClient
  .schema(loginSchema)
  .action(async ({ parsedInput: { username, password } }) => {
    try {
      const result = await signIn("credentials", {
        redirect: false,
        username,
        password,
      });
      console.log("[loginAction] SignIn result:", result);
      redirect("/clients");
    } catch (error) {
      console.log("[loginAction] SignIn error:", error);
      throw error;
    }
  });
