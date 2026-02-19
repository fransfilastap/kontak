import { kontakClient } from "@/lib/kontak";
import type { Metadata } from "next";
import { InboxClient } from "@/app/(admin)/inbox/inbox-client";

export const metadata: Metadata = {
  title: "Inbox - Kontak",
  description: "View and send WhatsApp messages.",
};

export default async function InboxPage() {
  const devices = await kontakClient.getDevices();
  return <InboxClient devices={devices ?? []} />;
}
