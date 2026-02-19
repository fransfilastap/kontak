import { kontakClient } from "@/lib/kontak";
import type { Metadata } from "next";
import { TemplateManagementClient } from "@/app/(admin)/messages/template-management-client";

export const metadata: Metadata = {
  title: "Message Templates - Kontak",
  description: "Create and manage reusable message templates.",
};

export default async function Page() {
  const templates = await kontakClient.getTemplates();
  return <TemplateManagementClient templates={templates ?? []} />;
}
