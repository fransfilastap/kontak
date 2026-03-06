import { kontakClient } from "@/lib/kontak";
import type { Metadata } from "next";
import { KontakProvider } from "@/app/providers/kontak-providers";
import { DeviceManagementClient } from "@/app/(admin)/clients/device-management-client";
import type { KontakClient } from "@/lib/types";

export const metadata: Metadata = {
  title: "Device Management - Kontak",
  description: "Manage your WhatsApp gateway devices.",
};

export default async function Page() {
  const clients = (await kontakClient.getDevices()) as unknown as KontakClient[];
  return (
    <KontakProvider>
      <DeviceManagementClient devices={clients ?? []} />
    </KontakProvider>
  );
}
