"use client";

import { useState } from "react";
import useSWR from "swr";
import fetcher from "@/lib/swr";
import type { Conversation } from "@/lib/types";
import { ConversationListItem } from "./conversation-list-item";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SearchIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ConversationListProps {
  deviceId: string;
  selectedChatJid: string | null;
  onSelectChat: (chatJid: string) => void;
}

export function ConversationList({
  deviceId,
  selectedChatJid,
  onSelectChat,
}: ConversationListProps) {
  const [search, setSearch] = useState("");

  const { data: conversations, isLoading } = useSWR<Conversation[]>(
    deviceId ? `/api/kontak/inbox/${deviceId}/conversations?limit=100` : null,
    fetcher,
    { refreshInterval: 5000 }
  );

  const filtered = conversations?.filter((c) =>
    c.recipient.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-full flex-col">
      <div className="p-3">
        <div className="relative">
          <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="px-1">
          {isLoading && (
            <div className="space-y-2 px-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-24" />
                    <Skeleton className="h-3 w-36" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {!isLoading && filtered && filtered.length === 0 && (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              No conversations found
            </p>
          )}
          {filtered?.map((conversation) => (
            <ConversationListItem
              key={conversation.recipient}
              conversation={conversation}
              isSelected={selectedChatJid === conversation.recipient}
              onClick={() => onSelectChat(conversation.recipient)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
