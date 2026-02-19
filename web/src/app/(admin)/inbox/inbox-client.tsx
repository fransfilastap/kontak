"use client";

import { useState, useCallback } from "react";
import type { KontakClient } from "@/lib/types";
import { ConversationList } from "./conversation-list";
import { MessageThread } from "./message-thread";
import { NewMessageDialog } from "./new-message-dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PenSquareIcon, InboxIcon } from "lucide-react";

interface InboxClientProps {
  devices: KontakClient[];
}

export function InboxClient({ devices }: InboxClientProps) {
  const connectedDevices = devices.filter((d) => d.is_connected);

  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(
    connectedDevices[0]?.id ?? devices[0]?.id ?? ""
  );
  const [selectedChatJid, setSelectedChatJid] = useState<string | null>(null);
  const [showNewMessage, setShowNewMessage] = useState(false);

  const handleSendMessage = useCallback(
    async (text: string) => {
      if (!selectedDeviceId || !selectedChatJid) return;
      await fetch(
        `/api/kontak/inbox/${selectedDeviceId}/messages/${encodeURIComponent(selectedChatJid)}/send`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        }
      );
    },
    [selectedDeviceId, selectedChatJid]
  );

  const handleSendNewMessage = useCallback(
    async (to: string, text: string) => {
      if (!selectedDeviceId) return;
      await fetch(
        `/api/kontak/inbox/${selectedDeviceId}/messages/send`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to, text }),
        }
      );
      // Select the new conversation
      setSelectedChatJid(to.includes("@") ? to : `${to}@s.whatsapp.net`);
    },
    [selectedDeviceId]
  );

  if (devices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh]">
        <InboxIcon className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="font-semibold text-lg mb-1">No devices available</h3>
        <p className="text-sm text-muted-foreground">
          Add and connect a device first to use the inbox.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Select value={selectedDeviceId} onValueChange={(v) => { setSelectedDeviceId(v); setSelectedChatJid(null); }}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select device" />
            </SelectTrigger>
            <SelectContent>
              {devices.map((device) => (
                <SelectItem key={device.id} value={device.id}>
                  <span className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        device.is_connected ? "bg-emerald-500" : "bg-zinc-400"
                      }`}
                    />
                    {device.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowNewMessage(true)}
          disabled={!selectedDeviceId}
        >
          <PenSquareIcon className="h-4 w-4 mr-2" />
          New Message
        </Button>
      </div>

      {/* Split Panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Conversation List */}
        <div className="w-80 shrink-0 border-r overflow-hidden">
          {selectedDeviceId ? (
            <ConversationList
              deviceId={selectedDeviceId}
              selectedChatJid={selectedChatJid}
              onSelectChat={setSelectedChatJid}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              Select a device
            </div>
          )}
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-hidden">
          {selectedChatJid && selectedDeviceId ? (
            <div className="flex h-full flex-col">
              {/* Chat Header */}
              <div className="flex items-center gap-3 border-b px-4 py-3">
                <div>
                  <h3 className="text-sm font-semibold">
                    {selectedChatJid.split("@")[0]}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedChatJid.includes("@g.us") ? "Group" : "Individual"}
                  </p>
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                <MessageThread
                  deviceId={selectedDeviceId}
                  chatJid={selectedChatJid}
                  onSend={handleSendMessage}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <InboxIcon className="h-12 w-12 mb-3" />
              <p className="text-sm">Select a conversation to start messaging</p>
            </div>
          )}
        </div>
      </div>

      {/* New Message Dialog */}
      {selectedDeviceId && (
        <NewMessageDialog
          open={showNewMessage}
          onOpenChange={setShowNewMessage}
          deviceId={selectedDeviceId}
          onSend={handleSendNewMessage}
        />
      )}
    </div>
  );
}
