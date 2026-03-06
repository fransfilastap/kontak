"use client";

import { useState, useRef, useCallback } from "react";
import useSWR from "swr";
import fetcher from "@/lib/swr";
import type { WhatsAppContact, MessageTemplate } from "@/lib/types";
import { WaMarkdown } from "./wa-markdown";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  SendHorizontalIcon,
  BoldIcon,
  ItalicIcon,
  StrikethroughIcon,
  CodeIcon,
  QuoteIcon,
  UserIcon,
  XIcon,
  FileTextIcon,
  EyeIcon,
  PenLineIcon,
  CalendarClockIcon,
} from "lucide-react";

interface NewMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deviceId: string;
  onSend: (to: string, text: string, scheduledAt?: string) => Promise<void>;
}

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

export function NewMessageDialog({
  open,
  onOpenChange,
  deviceId,
  onSend,
}: NewMessageDialogProps) {
  const [recipientMode, setRecipientMode] = useState<"contact" | "phone">("contact");
  const [selectedContact, setSelectedContact] = useState<WhatsAppContact | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [messageText, setMessageText] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [sending, setSending] = useState(false);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: contacts } = useSWR<WhatsAppContact[]>(
    open && deviceId ? `/api/kontak/contacts/${deviceId}` : null,
    fetcher
  );

  const { data: templates } = useSWR<MessageTemplate[]>(
    open ? `/api/kontak/templates` : null,
    fetcher
  );

  const recipient =
    recipientMode === "contact"
      ? selectedContact?.jid ?? ""
      : phoneNumber.replace(/\D/g, "");

  const recipientDisplay =
    recipientMode === "contact" && selectedContact
      ? selectedContact.full_name ||
        selectedContact.push_name ||
        selectedContact.phone_number ||
        selectedContact.jid.split("@")[0]
      : phoneNumber || "";

  const handleSend = useCallback(async () => {
    if (!recipient || !messageText.trim()) return;
    setSending(true);
    try {
      await onSend(recipient, messageText.trim(), scheduledAt ? new Date(scheduledAt).toISOString() : undefined);
      // Reset form
      setMessageText("");
      setPhoneNumber("");
      setScheduledAt("");
      setSelectedContact(null);
      setShowContactPicker(false);
      setShowPreview(false);
      onOpenChange(false);
    } finally {
      setSending(false);
    }
  }, [recipient, messageText, scheduledAt, onSend, onOpenChange]);

  const handleSelectTemplate = (templateId: string) => {
    const template = templates?.find((t) => t.id === templateId);
    if (template) {
      setMessageText(template.content);
      // Focus the textarea after template insertion
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
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
      } else if (e.key === "Enter") {
        e.preventDefault();
        handleSend();
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

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset on close
      setShowContactPicker(false);
      setShowPreview(false);
    }
    onOpenChange(newOpen);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-md md:max-w-lg xl:max-w-xl p-0 flex flex-col h-full bg-background border-l shadow-2xl"
      >
        <SheetHeader className="px-6 py-4 flex-none border-b bg-muted/20">
          <SheetTitle className="text-xl">New Message</SheetTitle>
          <SheetDescription className="text-sm">
            Compose and send a new WhatsApp message to a contact or direct number.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden p-6 gap-6">
          {/* Recipient Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Recipient</Label>
              <div className="flex rounded-md border p-0.5 bg-muted/20">
                <Button
                  variant={recipientMode === "contact" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 text-xs px-3 shadow-none"
                  onClick={() => {
                    setRecipientMode("contact");
                    if (!selectedContact) setShowContactPicker(true);
                  }}
                >
                  Contact
                </Button>
                <Button
                  variant={recipientMode === "phone" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 text-xs px-3 shadow-none"
                  onClick={() => {
                    setRecipientMode("phone");
                    setShowContactPicker(false);
                    setSelectedContact(null);
                  }}
                >
                  Phone
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {recipientMode === "contact" && selectedContact ? (
                <div className="flex-1 rounded-md border bg-card p-3 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                      <UserIcon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="grid flex-1 overflow-hidden">
                      <span className="truncate text-sm font-medium">{recipientDisplay}</span>
                      <span className="truncate text-xs text-muted-foreground">{selectedContact.phone_number || selectedContact.jid}</span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground shrink-0 rounded-full"
                    onClick={() => {
                      setSelectedContact(null);
                      setShowContactPicker(true);
                    }}
                  >
                    <XIcon className="h-4 w-4" />
                  </Button>
                </div>
              ) : recipientMode === "phone" ? (
                <div className="flex-1 flex flex-col gap-1">
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="e.g. 628123456789"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="pl-9 h-10 shadow-sm transition-colors focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary"
                    />
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full h-10 shadow-sm border-dashed gap-2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowContactPicker(true)}
                >
                  <UserIcon className="h-4 w-4" />
                  Select a contact to message
                </Button>
              )}
            </div>

            {/* Contact Picker Combobox */}
            {showContactPicker && recipientMode === "contact" && (
              <div className="rounded-md border shadow-md animate-in fade-in slide-in-from-top-2">
                <Command className="border-none w-full">
                  <CommandInput placeholder="Search contacts..." className="h-10 border-none focus:ring-0" />
                  <CommandList className="max-h-[160px] overflow-auto border-t">
                    <CommandEmpty className="py-6 text-center text-sm">No contacts found.</CommandEmpty>
                    <CommandGroup>
                      {contacts?.map((contact) => (
                        <CommandItem
                          key={contact.id}
                          value={`${contact.full_name || contact.push_name || contact.phone_number} ${contact.jid}`}
                          onSelect={() => {
                            setSelectedContact(contact);
                            setShowContactPicker(false);
                          }}
                          className="px-4 py-2 cursor-pointer"
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
              </div>
            )}
          </div>

          {/* Scheduling Section */}
          <div className="space-y-2">
             <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
               <CalendarClockIcon className="h-4 w-4" />
               Schedule (Optional)
             </Label>
             <div className="flex items-center gap-2">
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="h-10 flex-1 shadow-sm transition-colors focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary"
                  min={new Date().toISOString().slice(0, 16)}
                />
                {scheduledAt && (
                  <Button variant="ghost" size="icon" onClick={() => setScheduledAt("")} className="h-10 w-10 shrink-0 text-muted-foreground hover:text-destructive">
                    <XIcon className="h-4 w-4" />
                  </Button>
                )}
             </div>
             <p className="text-[11px] text-muted-foreground">Leave empty to send immediately.</p>
          </div>

          <Separator className="my-2 opacity-60" />

          {/* Template Selector */}
          {templates && templates.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
               <FileTextIcon className="h-4 w-4" />
               Templates
              </Label>
              <Select onValueChange={handleSelectTemplate}>
                <SelectTrigger className="h-10 shadow-sm transition-colors focus:ring-1 focus:ring-primary focus:border-primary">
                  <SelectValue placeholder="Insert a saved template..." />
                </SelectTrigger>
                <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)] max-h-60">
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id} className="py-2">
                      <div className="flex flex-col gap-0.5 max-w-full overflow-hidden">
                        <span className="font-medium text-sm truncate">{template.name}</span>
                        <span className="text-xs text-muted-foreground truncate opacity-80">
                          {template.content}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Message Editor Container */}
          <div className="flex-1 flex flex-col min-h-[260px] max-h-[460px] rounded-lg border shadow-sm focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all overflow-hidden bg-card">
            
            {/* Toolbar */}
            <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
              <div className="flex items-center gap-1">
                {toolbarButtons.map((btn) => (
                  <Button
                    key={btn.label}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                    onClick={btn.action}
                    title={btn.label}
                    type="button"
                  >
                    <btn.icon className="h-4 w-4" />
                  </Button>
                ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-xs font-medium bg-background border shadow-xs hover:bg-muted/50"
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

            {/* Editor Area */}
            {showPreview ? (
              <div className="flex-1 p-4 overflow-y-auto bg-muted/10">
                {messageText.trim() ? (
                  <WaMarkdown content={messageText} />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground italic opacity-70">
                    Nothing to preview
                  </div>
                )}
              </div>
            ) : (
              <Textarea
                ref={textareaRef}
                placeholder="Type your message here...&#10;&#10;Supports *bold*, _italic_, ~strikethrough~, and ```monospace```."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none resize-none font-mono text-[13px] leading-relaxed p-4 bg-transparent"
              />
            )}
            
            <div className="border-t bg-muted/20 px-4 py-2 flex justify-between items-center select-none">
                <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground/70">
                  Ctrl + Enter to send
                </span>
                <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground/70 tabular-nums">
                  {messageText.length} chars
                </span>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="flex-none p-6 pt-4 border-t bg-muted/10 flex items-center justify-end gap-3">
          <Button
            variant="outline"
            className="w-24 shadow-sm"
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            className="w-32 shadow-sm gap-2"
            onClick={handleSend}
            disabled={!recipient || !messageText.trim() || sending}
          >
            {sending ? (
              "Sending..."
            ) : (
              <>
                Send
                <SendHorizontalIcon className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
