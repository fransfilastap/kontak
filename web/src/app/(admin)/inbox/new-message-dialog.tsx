"use client";

import { useState, useRef, useCallback } from "react";
import useSWR from "swr";
import fetcher from "@/lib/swr";
import type { WhatsAppContact, MessageTemplate } from "@/lib/types";
import { WaMarkdown } from "./wa-markdown";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";

interface NewMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deviceId: string;
  onSend: (to: string, text: string) => Promise<void>;
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
      await onSend(recipient, messageText.trim());
      // Reset form
      setMessageText("");
      setPhoneNumber("");
      setSelectedContact(null);
      setShowContactPicker(false);
      setShowPreview(false);
      onOpenChange(false);
    } finally {
      setSending(false);
    }
  }, [recipient, messageText, onSend, onOpenChange]);

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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>New Message</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 overflow-hidden">
          {/* To field — email-style */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium shrink-0 w-8">To</Label>
              <div className="flex-1 flex items-center gap-2">
                {recipientMode === "contact" && selectedContact ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Badge variant="secondary" className="gap-1.5 pl-2 pr-1 py-1">
                      <UserIcon className="h-3 w-3" />
                      <span className="text-sm">{recipientDisplay}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedContact(null);
                          setShowContactPicker(true);
                        }}
                        className="ml-0.5 rounded-full hover:bg-muted p-0.5"
                      >
                        <XIcon className="h-3 w-3" />
                      </button>
                    </Badge>
                  </div>
                ) : recipientMode === "phone" ? (
                  <Input
                    placeholder="628123456789"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="h-8"
                  />
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-muted-foreground"
                    onClick={() => setShowContactPicker(true)}
                  >
                    <UserIcon className="h-3.5 w-3.5 mr-1.5" />
                    Select contact...
                  </Button>
                )}
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant={recipientMode === "contact" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 text-xs px-2"
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
                    className="h-7 text-xs px-2"
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
            </div>

            {/* Contact Picker dropdown */}
            {showContactPicker && recipientMode === "contact" && (
              <Command className="border rounded-lg">
                <CommandInput placeholder="Search contacts..." />
                <CommandList className="max-h-40">
                  <CommandEmpty>No contacts found.</CommandEmpty>
                  <CommandGroup>
                    {contacts?.map((contact) => (
                      <CommandItem
                        key={contact.id}
                        value={`${contact.full_name || contact.push_name || contact.phone_number} ${contact.jid}`}
                        onSelect={() => {
                          setSelectedContact(contact);
                          setShowContactPicker(false);
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

          {/* Template selector */}
          {templates && templates.length > 0 && (
            <div className="flex items-center gap-2">
              <FileTextIcon className="h-4 w-4 text-muted-foreground shrink-0" />
              <Select onValueChange={handleSelectTemplate}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Use a template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex flex-col">
                        <span>{template.name}</span>
                        <span className="text-xs text-muted-foreground truncate max-w-[300px]">
                          {template.content.slice(0, 60)}
                          {template.content.length > 60 ? "..." : ""}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Message editor with toolbar */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-1">
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

            {showPreview ? (
              <div className="flex-1 rounded-md border p-3 overflow-auto min-h-[120px] max-h-[240px] bg-muted/30">
                {messageText.trim() ? (
                  <WaMarkdown content={messageText} />
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Nothing to preview
                  </p>
                )}
              </div>
            ) : (
              <Textarea
                ref={textareaRef}
                placeholder="Compose your message...&#10;&#10;Use *bold*, _italic_, ~strikethrough~, ```monospace```, > quote"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 min-h-[120px] max-h-[240px] resize-none font-mono text-sm"
              />
            )}
          </div>

          <Separator />

          {/* Footer */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Ctrl+Enter to send
              {messageText.length > 0 && (
                <span className="ml-2">{messageText.length} characters</span>
              )}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSend}
                disabled={!recipient || !messageText.trim() || sending}
              >
                <SendHorizontalIcon className="h-4 w-4 mr-1.5" />
                {sending ? "Sending..." : "Send"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
