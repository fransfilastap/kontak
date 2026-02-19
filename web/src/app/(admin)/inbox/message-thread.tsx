"use client";

import { useEffect, useRef } from "react";
import useSWR from "swr";
import fetcher from "@/lib/swr";
import type { MessageLog } from "@/lib/types";
import { MessageBubble } from "./message-bubble";
import { ComposeBox } from "./compose-box";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

interface MessageThreadProps {
  deviceId: string;
  chatJid: string;
  onSend: (text: string) => Promise<void>;
}

export function MessageThread({ deviceId, chatJid, onSend }: MessageThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: messages, isLoading, mutate } = useSWR<MessageLog[]>(
    `/api/kontak/inbox/${deviceId}/messages/${encodeURIComponent(chatJid)}?limit=100`,
    fetcher,
    { refreshInterval: 3000 }
  );

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark conversation as read when opening
  useEffect(() => {
    fetch(
      `/api/kontak/inbox/${deviceId}/messages/${encodeURIComponent(chatJid)}/read`,
      { method: "POST" }
    ).catch(() => {});
  }, [deviceId, chatJid]);

  const handleSend = async (text: string) => {
    await onSend(text);
    mutate();
  };

  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-2">
          {isLoading && (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}
                >
                  <Skeleton className="h-10 w-48 rounded-lg" />
                </div>
              ))}
            </div>
          )}
          {messages?.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
      <ComposeBox onSend={handleSend} />
    </div>
  );
}
