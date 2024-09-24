import { ClientDataTable } from "@/app/(admin)/clients/data-table";
import { kontakClient } from "@/lib/kontak";
import { Metadata } from "next";
import { KontakProvider } from "@/app/providers/kontak-providers";
export const metadata: Metadata = {
  title: "Clients",
  description: "Manage your clients.",
};

export default async function Page() {
  const clients = await kontakClient.getDevices();
  return (
    <KontakProvider>
      <div className="container mx-auto flex flex-col gap-4 mt-4">
        <h1 className="text-2xl font-bold">Clients</h1>
        <ClientDataTable data={clients} />
      </div>
    </KontakProvider>
  );
}
