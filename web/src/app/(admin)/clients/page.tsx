import { ClientDataTable } from "@/app/(admin)/clients/data-table";
import { kontakClient } from "@/lib/kontak";
import type { Metadata } from "next";
import { KontakProvider } from "@/app/providers/kontak-providers";

export const metadata: Metadata = {
  title: "Device Management - Kontak",
  description: "Manage your WhatsApp devices.",
};

export default async function Page() {
  const clients = await kontakClient.getDevices();
  return (
    <KontakProvider>
      <div className="flex flex-col gap-4 p-4 lg:p-6">
        <h1 className="text-2xl font-bold">Device Management</h1>
        {clients && <ClientDataTable data={clients} />}
      </div>
    </KontakProvider>
  );
}
