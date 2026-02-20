"use client";

import type { MessageThread } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface ConversationListItemProps {
  thread: MessageThread;
  isSelected: boolean;
  onClick: () => void;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function getDisplayName(thread: MessageThread): string {
  if (thread.chat_name) {
    return thread.chat_name;
  }
  return thread.chat_jid.split("@")[0];
}

function getInitials(thread: MessageThread): string {
  const name = getDisplayName(thread);
  if (/^\d+$/.test(name)) {
    return name.slice(-2);
  }
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function ConversationListItem({
  thread,
  isSelected,
  onClick,
}: ConversationListItemProps) {
  const hasUnread = thread.unread_count > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-muted/50",
        isSelected && "bg-muted"
      )}
    >
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarFallback className="text-xs bg-primary/10 text-primary">
          {getInitials(thread)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 overflow-hidden">
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "truncate text-sm",
              hasUnread ? "font-semibold" : "font-medium"
            )}
          >
            {getDisplayName(thread)}
          </span>
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {formatRelativeTime(thread.last_message_at)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p
            className={cn(
              "truncate text-xs",
              hasUnread
                ? "text-foreground font-medium"
                : "text-muted-foreground"
            )}
          >
            {thread.last_message_direction === "outgoing" && (
              <span className="text-muted-foreground">You: </span>
            )}
            {thread.last_message_content || "Media"}
          </p>
          {hasUnread && (
            <Badge
              variant="default"
              className="h-5 min-w-5 shrink-0 rounded-full px-1.5 text-[10px] font-bold"
            >
              {thread.unread_count}
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}
