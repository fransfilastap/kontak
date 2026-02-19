"use client";

import type { Conversation } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface ConversationListItemProps {
  conversation: Conversation;
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

function getDisplayName(recipient: string, recipientName: string | null): string {
  if (recipientName) return recipientName;
  // Strip @s.whatsapp.net or @g.us
  const name = recipient.split("@")[0];
  return name;
}

function getInitials(recipient: string, recipientName: string | null): string {
  const name = getDisplayName(recipient, recipientName);
  // For phone numbers, use first 2 digits
  if (/^\d+$/.test(name)) {
    return name.slice(-2);
  }
  return name.slice(0, 2).toUpperCase();
}

export function ConversationListItem({
  conversation,
  isSelected,
  onClick,
}: ConversationListItemProps) {
  const hasUnread = conversation.unread_count > 0;

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
        <AvatarFallback className="text-xs">
          {getInitials(conversation.recipient, conversation.recipient_name)}
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
            {getDisplayName(conversation.recipient, conversation.recipient_name)}
          </span>
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {formatRelativeTime(conversation.last_message_at)}
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
            {conversation.last_message_direction === "outgoing" && (
              <span className="text-muted-foreground">You: </span>
            )}
            {conversation.last_message_content}
          </p>
          {hasUnread && (
            <Badge
              variant="default"
              className="h-5 min-w-5 shrink-0 rounded-full px-1.5 text-[10px] font-bold"
            >
              {conversation.unread_count}
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}
