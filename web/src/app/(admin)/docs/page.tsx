import { Metadata } from "next";
import { DocsClient } from "./docs-client";
import { endpointsData } from "./endpoints";

export const metadata: Metadata = {
  title: "API Documentation | Kontak",
  description: "API Documentation for Kontak integrations",
};

export default function DocsPage() {
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      <DocsClient endpoints={endpointsData} />
    </div>
  );
}
