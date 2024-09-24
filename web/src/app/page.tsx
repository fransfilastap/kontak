import { Button } from "@/components/ui/button";
import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kontak",
  description:
    "Kontak is a platform that connects your WhatsApp account to a REST API, allowing you to manage your messages and devices seamlessly.",
};

export default async function Home() {
  const session = await auth();
  if (session) {
    return redirect("/clients");
  }
  return (
    <div className="container mx-auto flex flex-col items-center justify-center h-screen">
      <h1 className="text-4xl font-bold">Kontak</h1>
      <h2 className="text-2xl text-gray-500">
        Kontak is a platform that connects your WhatsApp account to a REST API,
        allowing you to manage your messages and devices seamlessly.
      </h2>
      <div className="flex gap-4 mt-6">
        <Button asChild>
          <Link href={"/login"}>Login</Link>
        </Button>
        <Button variant="secondary" asChild>
          <Link href={"/register-device"}>Register Device</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={"/clients"}>Client</Link>
        </Button>
      </div>
    </div>
  );
}
