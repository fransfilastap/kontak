import type { Metadata } from "next";
import { KontakProvider } from "@/app/providers/kontak-providers";
import { ApiKeyClient } from "@/app/(admin)/api-key/api-key-client";

export const metadata: Metadata = {
  title: "API Key - Kontak",
  description: "Manage your WhatsApp gateway API key.",
};

export default async function Page() {
  return (
    <KontakProvider>
      <ApiKeyClient />
    </KontakProvider>
  );
}