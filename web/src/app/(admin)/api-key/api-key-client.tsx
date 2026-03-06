"use client";

import { useState, useEffect } from "react";
import { useKontak } from "@/app/providers/kontak-providers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  Copy, RefreshCw, CheckCircle2, AlertTriangle,
  Eye, EyeOff, Loader2, ShieldAlert, Terminal,
  Fingerprint, BookOpen, KeyRound, Server, Zap
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function ApiKeyClient() {
  const { apiKey, generateAPIKey, isGeneratingAPIKey } = useKontak();
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    if (apiKey) setHasApiKey(true);
  }, [apiKey]);

  const handleCopy = async () => {
    if (!apiKey) return;
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      toast.success("API key copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy API key");
    }
  };

  const handleGenerate = async () => {
    await generateAPIKey();
    setHasApiKey(true);
    setShowKey(true);
  };

  const maskedKey = apiKey
    ? apiKey.substring(0, 8) + "••••••••••••••••••••" + apiKey.substring(apiKey.length - 4)
    : "••••••••••••••••••••••••••••••••";

  return (
    <div className="p-6 md:p-8 max-w-5xl animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">API Credentials</h1>
            <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
              Manage secret keys for programmable access to the Kontak platform.
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-2 self-start shrink-0" asChild>
            <a href="https://docs.kontak.com" target="_blank" rel="noreferrer">
              <BookOpen className="h-3.5 w-3.5" />
              Documentation
            </a>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Main Column */}
        <div className="lg:col-span-3 flex flex-col gap-4">

          {/* API Key Card */}
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            {/* Card Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <KeyRound className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Production API Key</p>
                  <p className="text-xs text-muted-foreground">For server-side use only</p>
                </div>
              </div>
              {hasApiKey ? (
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800">
                  <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                  Active
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800">
                  <AlertTriangle className="mr-1.5 h-3 w-3" />
                  Not configured
                </Badge>
              )}
            </div>

            {/* Card Body */}
            <div className="p-6">
              {hasApiKey ? (
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Secret Key</Label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Fingerprint className="h-3.5 w-3.5 text-muted-foreground/60" />
                        </span>
                        <Input
                          id="api-key"
                          type={showKey ? "text" : "password"}
                          value={showKey ? (apiKey ?? "") : maskedKey}
                          readOnly
                          className="h-10 pl-9 pr-3 font-mono text-sm bg-muted/30 border-border/70 focus-visible:ring-1"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowKey(!showKey)}
                        title={showKey ? "Hide key" : "Reveal key"}
                      >
                        {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-10 gap-1.5 shrink-0"
                        onClick={handleCopy}
                        disabled={copied}
                      >
                        {copied
                          ? <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Copied</>
                          : <><Copy className="h-3.5 w-3.5" /> Copy</>
                        }
                      </Button>
                    </div>
                  </div>

                  <Alert className="py-3 border-amber-200 bg-amber-50/80 dark:bg-amber-950/20 dark:border-amber-900">
                    <ShieldAlert className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    <AlertDescription className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed ml-1">
                      Never expose this key client-side or in public repositories. Treat it like a password.
                    </AlertDescription>
                  </Alert>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
                  <div className="h-12 w-12 rounded-full border-2 border-dashed border-border flex items-center justify-center bg-muted/30">
                    <KeyRound className="h-5 w-5 text-muted-foreground/50" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">No API key yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Generate a key to start using the API</p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" className="gap-2" disabled={isGeneratingAPIKey}>
                        {isGeneratingAPIKey
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Zap className="h-3.5 w-3.5" />
                        }
                        Generate API Key
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Generate API Key</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will create a new secret key for accessing the Kontak API. Store it safely after generation.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleGenerate} disabled={isGeneratingAPIKey}>
                          {isGeneratingAPIKey ? <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Generating…</> : "Generate"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>

            {/* Card Footer */}
            {hasApiKey && (
              <div className="px-6 py-3 border-t bg-muted/10 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Last generated key is active</p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5 font-medium">
                      <RefreshCw className={`h-3.5 w-3.5 ${isGeneratingAPIKey ? "animate-spin" : ""}`} />
                      Roll key
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Roll API Key?</AlertDialogTitle>
                      <AlertDialogDescription className="leading-relaxed">
                        A new key will be generated and your <strong className="text-foreground">current key will be immediately invalidated</strong>. Any services using the old key will stop working.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleGenerate}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {isGeneratingAPIKey ? <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Rolling…</> : "Yes, roll key"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-2 flex flex-col gap-4">

          {/* cURL Example */}
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b bg-muted/20 flex items-center gap-2">
              <Terminal className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-0.5">Quick Start</span>
            </div>
            <div className="p-6">
              <p className="text-sm font-medium mb-1">Make your first request</p>
              <p className="text-xs text-muted-foreground mb-4">
                Add your key to the{" "}
                <code className="bg-muted px-1.5 py-0.5 rounded text-foreground border border-border/50">Authorization</code>{" "}
                header on every request.
              </p>
              <div className="rounded-lg bg-zinc-950 border border-zinc-800 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-zinc-800 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
                    <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
                    <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
                  </div>
                  <span className="text-[11px] font-mono text-zinc-500 ml-1">terminal</span>
                </div>
                <pre className="p-5 text-[12px] font-mono leading-relaxed overflow-x-auto">
                  <code>
                    <span className="text-zinc-500">$ </span>
                    <span className="text-pink-400">curl</span>
                    <span className="text-zinc-300"> -X POST \</span>{"\n"}
                    <span className="text-zinc-500">  </span>
                    <span className="text-green-400">"https://api.kontak.com/v1/chats"</span>
                    <span className="text-zinc-300"> \</span>{"\n"}
                    <span className="text-zinc-500">  </span>
                    <span className="text-yellow-400">-H</span>
                    <span className="text-zinc-300"> </span>
                    <span className="text-green-400">"Authorization: Bearer {"<"}YOUR_KEY{">"}"</span>
                    <span className="text-zinc-300"> \</span>{"\n"}
                    <span className="text-zinc-500">  </span>
                    <span className="text-yellow-400">-d</span>
                    <span className="text-zinc-300"> </span>
                    <span className="text-blue-300">{'\'{"mobile_number":"628xxx","text":"Hi"}\''}</span>
                  </code>
                </pre>
              </div>
            </div>
          </div>

          {/* Endpoints */}
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b bg-muted/20 flex items-center gap-2">
              <Server className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-0.5">Endpoints</span>
            </div>
            <div className="divide-y divide-border/60">
              {[
                { method: "POST", path: "/v1/chats", desc: "Send a text message" },
                { method: "POST", path: "/v1/chats/media", desc: "Send media file" },
                { method: "POST", path: "/v1/chats/template", desc: "Send a template" },
                { method: "GET",  path: "/v1/templates", desc: "List templates" },
              ].map(({ method, path, desc }) => (
                <div key={path} className="flex items-center gap-3 px-6 py-3.5">
                  <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded min-w-[38px] text-center ${
                    method === "GET"
                      ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  }`}>
                    {method}
                  </span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-mono font-medium text-foreground truncate">{path}</span>
                    <span className="text-[11px] text-muted-foreground">{desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}