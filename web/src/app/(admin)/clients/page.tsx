import { kontakClient } from "@/lib/kontak";
import type { Metadata } from "next";
import { KontakProvider } from "@/app/providers/kontak-providers";
import { DeviceManagementClient } from "@/app/(admin)/clients/device-management-client";

export const metadata: Metadata = {
  title: "Device Management - Kontak",
  description: "Manage your WhatsApp gateway devices.",
};

export default async function Page() {
  const clients = await kontakClient.getDevices();
  return (
    <KontakProvider>
      <DeviceManagementClient devices={clients ?? []} />
    </KontakProvider>
  );
}
