import type { Metadata } from "next";
import { KontakProvider } from "@/app/providers/kontak-providers";
import { BroadcastClient } from "@/app/(admin)/broadcast/broadcast-client";
import { kontakClient } from "@/lib/kontak";
import type { KontakClient } from "@/lib/types";

export const metadata: Metadata = {
  title: "Broadcast - Kontak",
  description: "Send and manage your WhatsApp broadcasts.",
};

export default async function Page() {
  const [devices, broadcasts] = await Promise.all([
    kontakClient.getDevices(),
    kontakClient.getBroadcasts(),
  ]);
  const deviceList = devices as unknown as KontakClient[];
  
  return (
    <KontakProvider>
      <BroadcastClient devices={deviceList ?? []} broadcasts={broadcasts ?? []} />
    </KontakProvider>
  );
}
