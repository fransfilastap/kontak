"use client";

import { useEffect, useRef } from "react";
import useSWR from "swr";
import fetcher from "@/lib/swr";
import type { MessageLog } from "@/lib/types";
import { MessageBubble, DateSeparator } from "./message-bubble";
import { ComposeBox } from "./compose-box";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

interface MessageThreadProps {
  deviceId: string;
  chatJid: string;
  onSend: (text: string) => Promise<void>;
  onSendMedia?: (file: File) => Promise<void>;
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((today.getTime() - msgDate.getTime()) / 86400000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: "long" });
  return date.toLocaleDateString([], { year: "numeric", month: "long", day: "numeric" });
}

function getDateKey(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function MessageThread({ deviceId, chatJid, onSend, onSendMedia }: MessageThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: messages, isLoading, mutate } = useSWR<MessageLog[]>(
    `/api/kontak/inbox/${deviceId}/threads/${encodeURIComponent(chatJid)}/messages?limit=100`,
    fetcher,
    { refreshInterval: 3000 }
  );

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark thread as read when opening
  useEffect(() => {
    fetch(
      `/api/kontak/inbox/${deviceId}/threads/${encodeURIComponent(chatJid)}/read`,
      { method: "POST" }
    ).catch(() => {});
  }, [deviceId, chatJid]);

  const handleSend = async (text: string) => {
    await onSend(text);
    mutate();
  };

  const handleSendMedia = async (file: File) => {
    if (onSendMedia) {
      await onSendMedia(file);
      mutate();
    }
  };

  // Build messages with date separators
  const renderMessages = () => {
    if (!messages) return null;
    const elements: React.ReactNode[] = [];
    let lastDateKey = "";

    for (const msg of messages) {
      const dateKey = getDateKey(msg.sent_at);
      if (dateKey !== lastDateKey) {
        elements.push(
          <DateSeparator key={`date-${dateKey}`} date={formatDateLabel(msg.sent_at)} />
        );
        lastDateKey = dateKey;
      }
      elements.push(<MessageBubble key={msg.id} message={msg} />);
    }
    return elements;
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
          {renderMessages()}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
      <ComposeBox onSend={handleSend} onSendMedia={handleSendMedia} />
    </div>
  );
}
