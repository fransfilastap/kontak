import { GalleryVerticalEnd } from "lucide-react";
import Link from "next/link";

import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main
      id="main-content"
      className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10"
    >
      <div className="flex w-full max-w-sm min-w-0 flex-col gap-6">
        <Link
          href="/"
          className="flex items-center gap-2 self-center font-medium outline-none ring-offset-background transition-colors hover:text-foreground/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm"
            aria-hidden="true"
          >
            <GalleryVerticalEnd className="size-4" aria-hidden="true" />
          </div>
          <span translate="no">Kontak</span>
        </Link>
        <LoginForm />
      </div>
    </main>
  );
}
