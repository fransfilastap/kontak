"use client";

import { useState, useRef, useCallback } from "react";
import useSWR from "swr";
import fetcher from "@/lib/swr";
import type { WhatsAppContact } from "@/lib/types";
import { kontakClient } from "@/lib/kontak";
import { WaMarkdown } from "../inbox/wa-markdown";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Separator } from "@/components/ui/separator";

import {
  BoldIcon,
  ItalicIcon,
  StrikethroughIcon,
  CodeIcon,
  QuoteIcon,
  UserIcon,
  XIcon,
  EyeIcon,
  PenLineIcon,
  PlusIcon,
} from "lucide-react";

function wrapSelection(
  textarea: HTMLTextAreaElement,
  prefix: string,
  suffix: string
) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  const selected = text.slice(start, end);
  const replacement = `${prefix}${selected}${suffix}`;

  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    "value"
  )?.set;
  nativeInputValueSetter?.call(
    textarea,
    text.slice(0, start) + replacement + text.slice(end)
  );
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  textarea.focus();
  textarea.setSelectionRange(
    start + prefix.length,
    start + prefix.length + selected.length
  );
}

function prependLines(textarea: HTMLTextAreaElement, prefix: string) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  const selected = text.slice(start, end);
  const replacement = selected
    .split("\n")
    .map((line) => `${prefix}${line}`)
    .join("\n");

  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    "value"
  )?.set;
  nativeInputValueSetter?.call(
    textarea,
    text.slice(0, start) + replacement + text.slice(end)
  );
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  textarea.focus();
}

export function BroadcastClient({ devices, broadcasts: initialBroadcasts }: { devices: any[]; broadcasts: any[] }) {
  const [broadcasts, setBroadcasts] = useState(initialBroadcasts);
  const [loading, setLoading] = useState(false);
  const [isNewSheetOpen, setIsNewSheetOpen] = useState(false);
  
  const [selectedContacts, setSelectedContacts] = useState<WhatsAppContact[]>([]);
  const [showContactPicker, setShowContactPicker] = useState(false);
  
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [formData, setFormData] = useState({
    device_id: devices[0]?.id || "",
    name: "",
    content: "",
    message_type: "text",
    cooldown: 5,
  });

  // Job Details State
  const [isDetailsSheetOpen, setIsDetailsSheetOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [jobRecipients, setJobRecipients] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const { data: contacts } = useSWR<WhatsAppContact[]>(
    isNewSheetOpen && formData.device_id ? `/api/kontak/contacts/${formData.device_id}` : null,
    fetcher
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (selectedContacts.length === 0) {
        toast.error("Please add at least one recipient contact");
        setLoading(false);
        return;
      }

      if (!formData.content.trim()) {
        toast.error("Message content cannot be empty.");
        setLoading(false);
        return;
      }

      const recipientList = selectedContacts.map(c => c.jid);

      await kontakClient.createBroadcast({
        ...formData,
        recipients: recipientList,
      });

      toast.success("Broadcast created successfully");
      const updatedBroadcasts = await kontakClient.getBroadcasts();
      setBroadcasts(updatedBroadcasts);
      
      // Reset form
      setFormData({
        device_id: devices[0]?.id || "",
        name: "",
        content: "",
        message_type: "text",
        cooldown: 5,
      });
      setSelectedContacts([]);
      setShowContactPicker(false);
      setShowPreview(false);
      setIsNewSheetOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to create broadcast");
    } finally {
      setLoading(false);
    }
  };

  const removeContact = (id: string) => {
    setSelectedContacts(prev => prev.filter(c => c.id !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const ta = textareaRef.current;
    if (!ta) return;

    if (e.ctrlKey || e.metaKey) {
      if (e.key === "b") {
        e.preventDefault();
        wrapSelection(ta, "*", "*");
      } else if (e.key === "i") {
        e.preventDefault();
        wrapSelection(ta, "_", "_");
      } else if (e.shiftKey && e.key === "x") {
        e.preventDefault();
        wrapSelection(ta, "~", "~");
      }
    }
  };

  const toolbarButtons = [
    { icon: BoldIcon, label: "Bold (Ctrl+B)", action: () => textareaRef.current && wrapSelection(textareaRef.current, "*", "*") },
    { icon: ItalicIcon, label: "Italic (Ctrl+I)", action: () => textareaRef.current && wrapSelection(textareaRef.current, "_", "_") },
    { icon: StrikethroughIcon, label: "Strikethrough", action: () => textareaRef.current && wrapSelection(textareaRef.current, "~", "~") },
    { icon: CodeIcon, label: "Monospace", action: () => textareaRef.current && wrapSelection(textareaRef.current, "```", "```") },
    { icon: QuoteIcon, label: "Quote", action: () => textareaRef.current && prependLines(textareaRef.current, "> ") },
  ];

  const handleRowClick = async (job: any) => {
    setSelectedJob(job);
    setIsDetailsSheetOpen(true);
    setLoadingDetails(true);
    try {
      const details = await kontakClient.getBroadcastJob(job.id);
      setJobRecipients((details.recipients || []) as any);
    } catch (error: any) {
      toast.error(error.message || "Failed to load broadcast details");
    } finally {
      setLoadingDetails(false);
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Broadcast</h2>
        <Sheet open={isNewSheetOpen} onOpenChange={setIsNewSheetOpen}>
          <SheetTrigger asChild>
            <Button><PlusIcon className="w-4 h-4 mr-2" /> New Broadcast</Button>
          </SheetTrigger>
          <SheetContent className="sm:max-w-xl overflow-y-auto">
            <SheetHeader className="mb-6">
              <SheetTitle>Create New Broadcast</SheetTitle>
              <SheetDescription>
                Configure your broadcast message and select recipients from your device contacts.
              </SheetDescription>
            </SheetHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex gap-4">
                <div className="w-1/2 space-y-2">
                  <Label htmlFor="name">Broadcast Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g. Monthly Newsletter"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="w-1/2 space-y-2">
                  <Label htmlFor="cooldown">Cooldown (seconds)</Label>
                  <Input
                    id="cooldown"
                    type="number"
                    min="1"
                    value={formData.cooldown}
                    onChange={(e) =>
                      setFormData({ ...formData, cooldown: parseInt(e.target.value) })
                    }
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="device">Device</Label>
                <Select
                  value={formData.device_id}
                  onValueChange={(value) => {
                    setFormData({ ...formData, device_id: value });
                    setSelectedContacts([]); // reset contacts when device changes
                  }}
                  required
                >
                  <SelectTrigger id="device" className="h-14">
                    <SelectValue placeholder="Select device" />
                  </SelectTrigger>
                  <SelectContent>
                    {devices.map((device) => (
                      <SelectItem key={device.id} value={device.id}>
                         <div className="flex flex-col py-1">
                            <span className="flex items-center gap-2 font-medium">
                              <span
                                className={`h-2 w-2 rounded-full shrink-0 ${
                                  device.is_connected ? "bg-emerald-500" : "bg-zinc-400"
                                }`}
                              />
                              {device.name}
                            </span>
                            {(device.whatsapp_number || device.id) && (
                              <span className="text-xs text-muted-foreground ml-4">
                                {device.whatsapp_number || device.id}
                              </span>
                            )}
                          </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Recipients</Label>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    type="button" 
                    className="h-6 text-xs px-2"
                    onClick={() => setShowContactPicker(!showContactPicker)}
                  >
                    <UserIcon className="w-3 h-3 mr-1" />
                    {showContactPicker ? "Hide contacts" : "Select contacts"}
                  </Button>
                </div>
                
                {selectedContacts.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-2 min-h-10 border rounded-md mb-2">
                    {selectedContacts.map((contact) => (
                      <Badge key={contact.id} variant="secondary" className="gap-1.5 pl-2 pr-1 py-1">
                        <span className="text-sm truncate max-w-[150px]">
                           {contact.full_name || contact.push_name || contact.phone_number || contact.jid.split("@")[0]}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeContact(contact.id)}
                          className="ml-0.5 rounded-full hover:bg-muted p-0.5 shrink-0"
                        >
                          <XIcon className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                
                {showContactPicker && (
                  <Command className="border rounded-lg max-h-64">
                    <CommandInput placeholder="Search contacts..." />
                    <CommandList>
                      <CommandEmpty>
                        {!contacts ? "Loading contacts..." : "No contacts found."}
                      </CommandEmpty>
                      <CommandGroup>
                        {contacts?.filter(c => !selectedContacts.some(sc => sc.id === c.id)).map((contact) => (
                          <CommandItem
                            key={contact.id}
                            value={`${contact.full_name || contact.push_name || contact.phone_number} ${contact.jid}`}
                            onSelect={() => {
                              setSelectedContacts(prev => [...prev, contact]);
                            }}
                          >
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">
                                {contact.full_name ||
                                  contact.push_name ||
                                  contact.phone_number ||
                                  contact.jid.split("@")[0]}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {contact.phone_number || contact.jid}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                )}
              </div>

              <Separator />

              <div className="space-y-2 flex flex-col min-h-0">
                 <div className="flex items-center justify-between mb-1">
                  <Label htmlFor="content">Message Content</Label>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      {toolbarButtons.map((btn) => (
                        <Button
                          key={btn.label}
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={btn.action}
                          title={btn.label}
                          type="button"
                        >
                          <btn.icon className="h-3.5 w-3.5" />
                        </Button>
                      ))}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 text-xs px-2"
                      onClick={() => setShowPreview(!showPreview)}
                      type="button"
                    >
                      {showPreview ? (
                        <>
                          <PenLineIcon className="h-3.5 w-3.5" />
                          Edit
                        </>
                      ) : (
                        <>
                          <EyeIcon className="h-3.5 w-3.5" />
                          Preview
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {showPreview ? (
                  <div className="flex-1 rounded-md border p-4 overflow-auto min-h-[150px] max-h-[300px] bg-muted/30">
                    {formData.content.trim() ? (
                      <WaMarkdown content={formData.content} />
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        Nothing to preview
                      </p>
                    )}
                  </div>
                ) : (
                  <Textarea
                    id="content"
                    ref={textareaRef}
                    placeholder="Compose your broadcast message...&#10;&#10;Use *bold*, _italic_, ~strikethrough~, ```monospace```, > quote"
                    value={formData.content}
                    onChange={(e) =>
                      setFormData({ ...formData, content: e.target.value })
                    }
                    onKeyDown={handleKeyDown}
                    className="min-h-[150px] max-h-[300px] flex-1 resize-y font-mono text-sm"
                    required
                  />
                )}
              </div>

              <Button type="submit" disabled={loading || selectedContacts.length === 0} className="w-full">
                {loading ? "Creating..." : "Start Broadcast"}
              </Button>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
          <CardDescription>
            View and track your previous broadcast jobs. Click on a row to see detailed recipient status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cooldown</TableHead>
                <TableHead>Created At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {broadcasts && broadcasts.length > 0 ? (
                broadcasts.map((job) => (
                  <TableRow 
                    key={job.id} 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleRowClick(job)}
                  >
                    <TableCell className="font-medium">{job.name}</TableCell>
                    <TableCell>
                      {devices.find((d) => d.id === job.device_id)?.name || job.device_id}
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        job.status === 'completed' ? 'secondary' : 
                        job.status === 'processing' ? 'default' : 
                        job.status === 'failed' ? 'destructive' : 'outline'
                      }>
                        {job.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{job.cooldown}s</TableCell>
                    <TableCell>
                      {new Date(job.created_at).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No broadcasts found. Start by creating a new one.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Broadcast Job Details Sheet */}
      <Sheet open={isDetailsSheetOpen} onOpenChange={setIsDetailsSheetOpen}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>Broadcast Details</SheetTitle>
            <SheetDescription>
              View detailed recipient status for {selectedJob?.name}
            </SheetDescription>
          </SheetHeader>

          {selectedJob && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-muted/50">
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm font-medium">Status</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <Badge variant={
                      selectedJob.status === 'completed' ? 'secondary' : 
                      selectedJob.status === 'processing' ? 'default' : 
                      selectedJob.status === 'failed' ? 'destructive' : 'outline'
                    } className="mb-2">
                      {selectedJob.status}
                    </Badge>
                    <div className="text-sm text-muted-foreground">
                      Created: {new Date(selectedJob.created_at).toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-muted/50">
                   <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm font-medium">Device</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="font-medium">
                      {devices.find((d) => d.id === selectedJob.device_id)?.name || selectedJob.device_id}
                    </div>
                    <div className="text-sm text-muted-foreground">
                       Cooldown: {selectedJob.cooldown}s
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Message Content Preview */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium leading-none">Message Content</h3>
                <div className="rounded-md border p-4 bg-muted/30 text-sm">
                   <WaMarkdown content={selectedJob.content} />
                </div>
              </div>

              <Separator />

              {/* Recipient Details Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium leading-none">Recipients ({jobRecipients.length})</h3>
                </div>
                
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>JID/Number</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Sent At</TableHead>
                        <TableHead className="w-[150px]">Error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingDetails ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                            Loading details...
                          </TableCell>
                        </TableRow>
                      ) : jobRecipients.length > 0 ? (
                        jobRecipients.map((recipient) => (
                          <TableRow key={recipient.id}>
                            <TableCell className="font-mono text-xs">
                              {recipient.recipient_jid.split("@")[0]}
                            </TableCell>
                            <TableCell>
                              <Badge variant={
                                recipient.status === 'sent' ? 'secondary' : 
                                recipient.status === 'delivered' ? 'default' : 
                                recipient.status === 'read' ? 'default' : 
                                recipient.status === 'failed' ? 'destructive' : 'outline'
                              } className="text-[10px] px-1.5 py-0 h-5">
                                {recipient.status || 'pending'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {recipient.sent_at ? new Date(recipient.sent_at).toLocaleString() : '-'}
                            </TableCell>
                            <TableCell className="text-xs text-destructive max-w-[150px] truncate" title={recipient.error_message}>
                              {recipient.error_message || '-'}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                            No recipients found for this job.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

            </div>
          )}
        </SheetContent>
      </Sheet>

    </div>
  );
}
