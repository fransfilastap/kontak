"use client";

import { useState } from "react";
import useSWR from "swr";
import fetcher from "@/lib/swr";
import type { WhatsAppContact } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SendHorizontalIcon } from "lucide-react";

interface NewMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deviceId: string;
  onSend: (to: string, text: string) => Promise<void>;
}

export function NewMessageDialog({
  open,
  onOpenChange,
  deviceId,
  onSend,
}: NewMessageDialogProps) {
  const [selectedContact, setSelectedContact] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [tab, setTab] = useState("contact");

  const { data: contacts } = useSWR<WhatsAppContact[]>(
    open && deviceId
      ? `/api/kontak/contacts/${deviceId}`
      : null,
    fetcher
  );

  const recipient = tab === "contact" ? selectedContact : phoneNumber;

  const handleSend = async () => {
    if (!recipient || !messageText.trim()) return;
    setSending(true);
    try {
      // For phone numbers, just use the number; the backend getJID will add @s.whatsapp.net
      const to = tab === "phone" ? phoneNumber.replace(/\D/g, "") : recipient;
      await onSend(to, messageText.trim());
      setMessageText("");
      setPhoneNumber("");
      setSelectedContact("");
      onOpenChange(false);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Message</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full">
            <TabsTrigger value="contact" className="flex-1">
              Contact
            </TabsTrigger>
            <TabsTrigger value="phone" className="flex-1">
              Phone Number
            </TabsTrigger>
          </TabsList>

          <TabsContent value="contact" className="mt-3">
            <Command className="border rounded-lg">
              <CommandInput placeholder="Search contacts..." />
              <CommandList className="max-h-48">
                <CommandEmpty>No contacts found.</CommandEmpty>
                <CommandGroup>
                  {contacts?.map((contact) => (
                    <CommandItem
                      key={contact.id}
                      value={`${contact.full_name || contact.push_name || contact.phone_number} ${contact.jid}`}
                      onSelect={() => setSelectedContact(contact.jid)}
                      className={selectedContact === contact.jid ? "bg-muted" : ""}
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {contact.full_name || contact.push_name || contact.phone_number || contact.jid.split("@")[0]}
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
            {selectedContact && (
              <p className="mt-2 text-xs text-muted-foreground">
                To: {selectedContact}
              </p>
            )}
          </TabsContent>

          <TabsContent value="phone" className="mt-3">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                placeholder="e.g. 628123456789"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="space-y-2 mt-2">
          <Label htmlFor="message">Message</Label>
          <Textarea
            id="message"
            placeholder="Type your message..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={3}
          />
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleSend}
            disabled={!recipient || !messageText.trim() || sending}
          >
            <SendHorizontalIcon className="h-4 w-4 mr-2" />
            {sending ? "Sending..." : "Send"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
