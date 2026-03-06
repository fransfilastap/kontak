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
  const devices = (await kontakClient.getDevices()) as unknown as KontakClient[];
  const broadcasts = await kontakClient.getBroadcasts();
  
  return (
    <KontakProvider>
      <BroadcastClient devices={devices ?? []} broadcasts={broadcasts ?? []} />
    </KontakProvider>
  );
}
