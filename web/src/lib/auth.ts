import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { APIError, createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { parseUserOutput } from "better-auth/db";
import * as z from "zod";
import { loginKontakApi } from "@/lib/kontak-credentials";

const signInKontakBody = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

function kontakCredentialsPlugin() {
  return {
    id: "kontak-credentials",
    endpoints: {
      signInKontak: createAuthEndpoint(
        "/sign-in/kontak",
        {
          method: "POST",
          body: signInKontakBody,
        },
        async (ctx) => {
          const { email: rawEmail, password } = ctx.body;
          const email = rawEmail.trim().toLowerCase();
          const kontak = await loginKontakApi(email, password);
          if (!kontak?.token) {
            throw APIError.from("UNAUTHORIZED", {
              code: "INVALID_CREDENTIALS",
              message: "Invalid email or password",
            });
          }

          let user = await ctx.context.adapter.findOne({
            model: "user",
            where: [{ field: "email", value: email }],
          });

          if (!user) {
            user = await ctx.context.internalAdapter.createUser({
              email,
              name: email.split("@")[0] || email,
              emailVerified: true,
            });
          }

          if (!user) {
            throw APIError.from("INTERNAL_SERVER_ERROR", {
              code: "FAILED_TO_CREATE_USER",
              message: "Failed to create user",
            });
          }

          const { id: userId } = user as { id: string };

          const session = await ctx.context.internalAdapter.createSession(
            userId,
            false,
            { access_token: kontak.token }
          );

          if (!session) {
            throw APIError.from("INTERNAL_SERVER_ERROR", {
              code: "FAILED_TO_CREATE_SESSION",
              message: "Failed to create session",
            });
          }

          type SessionCookiePayload = Parameters<typeof setSessionCookie>[1];
          await setSessionCookie(ctx, {
            session,
            user: user as SessionCookiePayload["user"],
          }, false);

          return ctx.json({
            token: session.token,
            user: parseUserOutput(
              ctx.context.options,
              user as SessionCookiePayload["user"]
            ),
          });
        }
      ),
    },
  };
}

const baseURL =
  process.env.BETTER_AUTH_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "http://localhost:3000";

export const auth = betterAuth({
  secret:
    process.env.BETTER_AUTH_SECRET ||
    process.env.AUTH_SECRET ||
    "better-auth-secret-12345678901234567890",
  baseURL,
  basePath: "/api/auth",
  trustedOrigins: [
    baseURL,
    ...(process.env.NEXT_PUBLIC_APP_URL &&
    process.env.NEXT_PUBLIC_APP_URL !== baseURL
      ? [process.env.NEXT_PUBLIC_APP_URL]
      : []),
  ],
  session: {
    expiresIn: 60 * 60,
    updateAge: 60 * 30,
    additionalFields: {
      access_token: { type: "string" },
    },
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60,
      strategy: "jwe",
      refreshCache: true,
    },
  },
  plugins: [kontakCredentialsPlugin(), nextCookies()],
});
