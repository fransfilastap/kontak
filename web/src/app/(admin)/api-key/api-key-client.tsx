"use client";

import { useState, useEffect, useCallback } from "react";
import { useKontak } from "@/app/providers/kontak-providers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  Copy, CheckCircle2, AlertTriangle,
  Loader2, ShieldAlert, Terminal,
  BookOpen, KeyRound, Server, Zap, Plus, Trash2
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface APIKeyData {
  ID: string;
  Name: string;
  KeyPrefix: string;
  CreatedAt: string;
  LastUsedAt: string;
  IsActive: boolean;
  APIKey?: string;
}

const formatDate = (dateStr: string) => {
  if (!dateStr || dateStr === "0001-01-01T00:00:00Z") return "Never";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "Never";
  }
};

const ENDPOINTS = [
  { method: "POST", path: "/v1/chats", desc: "Send a text message" },
  { method: "POST", path: "/v1/chats/media", desc: "Send media file" },
  { method: "POST", path: "/v1/chats/template", desc: "Send a template" },
  { method: "GET",  path: "/v1/templates", desc: "List templates" },
];

export function ApiKeyClient() {
  const { apiKeys, getAPIKeys, createAPIKey, deleteAPIKey, isGeneratingAPIKey } = useKontak();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<APIKeyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadKeys = useCallback(async () => {
    setIsLoading(true);
    await getAPIKeys();
    setIsLoading(false);
  }, [getAPIKeys]);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  const handleCopy = useCallback(async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success("API key copied to clipboard");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Failed to copy API key");
    }
  }, []);

  const handleCreateKey = useCallback(async () => {
    if (!newKeyName.trim()) {
      toast.error("Please enter a name for the API key");
      return;
    }
    try {
      const newKey = await createAPIKey(newKeyName);
      setNewlyCreatedKey(newKey);
      setNewKeyName("");
      setIsCreateDialogOpen(false);
    } catch (error) {
      // Error is already handled in createAPIKey
    }
  }, [newKeyName, createAPIKey]);

  const handleDeleteKey = useCallback(async (id: string) => {
    try {
      await deleteAPIKey(id);
    } catch (error) {
      // Error is already handled
    }
  }, [deleteAPIKey]);

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 max-w-5xl animate-in fade-in duration-300">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">API Credentials</h1>
            <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
              Manage secret keys for programmatic access to the Kontak platform.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2 self-start shrink-0" asChild>
              <a href="https://docs.kontak.com" target="_blank" rel="noreferrer">
                <BookOpen className="h-3.5 w-3.5" />
                Documentation
              </a>
            </Button>
            <Button
              size="sm"
              className="gap-2 self-start shrink-0"
              onClick={() => setIsCreateDialogOpen(true)}
              disabled={apiKeys.length >= 5}
            >
              <Plus className="h-3.5 w-3.5" />
              New Key
            </Button>
          </div>
        </div>
        {apiKeys.length >= 5 && (
          <Alert className="mt-4 py-3 border-amber-200 bg-amber-50/80 dark:bg-amber-950/20 dark:border-amber-900">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="text-sm text-amber-700 dark:text-amber-400 ml-2">
              Maximum of 5 API keys reached. Delete an existing key to create a new one.
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Main Column - API Keys List */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          {apiKeys.length === 0 ? (
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
              <div className="p-12 flex flex-col items-center justify-center text-center gap-4">
                <div className="h-12 w-12 rounded-full border-2 border-dashed border-border flex items-center justify-center bg-muted/30">
                  <KeyRound className="h-5 w-5 text-muted-foreground/50" />
                </div>
                <div>
                  <p className="text-sm font-medium">No API keys yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Create a key to start using the API</p>
                </div>
              </div>
            </div>
          ) : (
            apiKeys.map((key) => (
              <div key={key.ID} className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/20">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <KeyRound className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{key.Name}</p>
                      <p className="text-xs text-muted-foreground">
                        Created {formatDate(key.CreatedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800">
                      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
                      Active
                    </Badge>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete API Key?</AlertDialogTitle>
                          <AlertDialogDescription className="leading-relaxed">
                            Are you sure you want to delete <strong className="text-foreground">"{key.Name}"</strong>? 
                            Any services using this key will immediately lose access.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteKey(key.ID)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete {key.ID}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <code className="text-[13px] font-mono tracking-wider text-muted-foreground px-3 py-1.5 bg-muted/40 border border-border/50 rounded-md w-fit">
                    {key.KeyPrefix}••••••••••••••••••••••••
                  </code>
                  <div className="text-xs text-muted-foreground font-medium">
                    Last used: {formatDate(key.LastUsedAt)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Security Notice */}
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b bg-muted/20 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-0.5">Security</span>
            </div>
            <div className="p-6">
              <ul className="space-y-3 text-xs text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                  Never share your API keys publicly
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                  Store keys in environment variables
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                  Rotate keys periodically
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                  Delete unused keys immediately
                </li>
              </ul>
            </div>
          </div>

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
              {ENDPOINTS.map(({ method, path, desc }) => (
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

      {/* Create Key Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New API Key</DialogTitle>
            <DialogDescription>
              Give your API key a descriptive name to help you identify it later.
              You can have up to 5 API keys.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="key-name" className="text-sm font-medium">
              Key Name
            </Label>
            <Input
              id="key-name"
              placeholder="e.g., Production Server, Development"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              className="mt-2"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateKey();
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateKey} disabled={isGeneratingAPIKey || !newKeyName.trim()}>
              {isGeneratingAPIKey ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Create Key
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Newly Created Key Dialog */}
      <Dialog open={!!newlyCreatedKey} onOpenChange={(open) => {
        if (!open) setNewlyCreatedKey(null);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              API Key Created
            </DialogTitle>
            <DialogDescription className="py-2 leading-relaxed">
              Please copy your new API key and save it somewhere safe. For security reasons, <strong className="font-semibold text-foreground">you will not be able to see it again</strong>.
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-4 bg-muted/40 border rounded-lg flex items-center justify-between gap-3 my-2">
            <code className="text-sm font-mono break-all text-foreground">
              {newlyCreatedKey?.APIKey}
            </code>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 h-8 px-3 transition-all"
              onClick={() => handleCopy(newlyCreatedKey?.APIKey || "", newlyCreatedKey?.ID || "")}
            >
              {copiedId === newlyCreatedKey?.ID ? (
                <><CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-emerald-500" /> Copied!</>
              ) : (
                <><Copy className="h-3.5 w-3.5 mr-1.5" /> Copy</>
              )}
            </Button>
          </div>

          <DialogFooter className="sm:justify-start">
            <Button className="w-full sm:w-auto mt-2" onClick={() => setNewlyCreatedKey(null)}>
              I've saved it securely
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}