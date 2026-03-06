import type { Metadata } from "next";
import { KontakProvider } from "@/app/providers/kontak-providers";
import { ContactsManagementClient } from "@/app/(admin)/contacts/contacts-management-client";
import { kontakClient } from "@/lib/kontak";
import type { KontakClient } from "@/lib/types";

export const metadata: Metadata = {
  title: "Contacts Management - Kontak",
  description: "Manage your WhatsApp contacts across all devices.",
};

export default async function Page() {
  const devices = (await kontakClient.getDevices()) as unknown as KontakClient[];
  return (
    <KontakProvider>
      <ContactsManagementClient devices={devices ?? []} />
    </KontakProvider>
  );
}
