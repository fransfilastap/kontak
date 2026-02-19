import type { Metadata } from "next";
import { KontakProvider } from "@/app/providers/kontak-providers";
import { GroupsManagementClient } from "@/app/(admin)/groups/groups-management-client";
import { kontakClient } from "@/lib/kontak";

export const metadata: Metadata = {
  title: "Groups Management - Kontak",
  description: "Manage your WhatsApp groups across all devices.",
};

export default async function Page() {
  const devices = await kontakClient.getDevices();
  return (
    <KontakProvider>
      <GroupsManagementClient devices={devices ?? []} />
    </KontakProvider>
  );
}
