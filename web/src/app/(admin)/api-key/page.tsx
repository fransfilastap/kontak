"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/router";
import { KontakProvider, useKontak } from "@/app/providers/kontak-providers";
import { useAction } from "next-safe-action/hooks";
import { generateApiKeyAction } from "./action";

export default function Page() {
  const { execute, isPending, result } = useAction(generateApiKeyAction);

  return (
    <div className="container mx-auto flex flex-col gap-4 mt-4">
      <h1 className="text-2xl font-bold">Generate API Key</h1>
      <div className="flex flex-col gap-2">
        <Button onClick={() => execute()} disabled={isPending}>
          {isPending ? "Generating..." : "Generate API Key"}
        </Button>
        {result && (
          <div className="mt-4">
            <h2 className="text-xl font-semibold">Your API Key:</h2>
            <pre>{result.data}</pre>
            <p className="mt-2 text-red-500">
              Please save this API key securely. You will not be able to see it
              again.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}