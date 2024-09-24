import NextAuth, { DefaultSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { kontakClient } from "@/lib/kontak";
import { ZodError } from "zod";
import { loginSchema } from "./app/login/zod-schema";

declare module "next-auth" {
  // Extend employee to reveal access_token
  interface User {
    access_token: string | null;
  }

  // Extend session to hold the access_token
  interface Session {
    access_token: string | null;
    user: User;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          if (!credentials) return null;
          const { username, password } = await loginSchema.parseAsync(
            credentials
          );
          const response = await kontakClient.login(username, password);
          return {
            access_token: response.token,
          };
        } catch (error) {
          if (error instanceof ZodError) {
            return null;
          }
          throw error;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 1,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token = {
          access_token: user.access_token,
        };
      }
      return token;
    },
    async session({ session, token }) {
      return {
        ...session,
        access_token: token.access_token,
      };
    },
  },
});
