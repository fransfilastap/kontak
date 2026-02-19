"use client";

import type { MessageLog } from "@/lib/types";
import { WaMarkdown } from "./wa-markdown";
import { CheckIcon, CheckCheckIcon, FileIcon, DownloadIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface MessageBubbleProps {
  message: MessageLog;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function StatusIcon({ status }: { status: string }) {
  if (status === "read") {
    return <CheckCheckIcon className="h-3.5 w-3.5 text-blue-500" />;
  }
  if (status === "delivered") {
    return <CheckCheckIcon className="h-3.5 w-3.5 text-muted-foreground" />;
  }
  // "sent"
  return <CheckIcon className="h-3.5 w-3.5 text-muted-foreground" />;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isOutgoing = message.direction === "outgoing";

  const renderContent = () => {
    switch (message.message_type) {
      case "image":
        return (
          <div className="space-y-2">
            <img 
              src={message.media_url || ""} 
              alt={message.content} 
              className="max-w-full rounded-md cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => window.open(message.media_url || "", "_blank")}
            />
            {message.content && <WaMarkdown content={message.content} />}
          </div>
        );
      case "video":
        return (
          <div className="space-y-2">
            <video 
              src={message.media_url || ""} 
              controls 
              className="max-w-full rounded-md"
            />
            {message.content && <WaMarkdown content={message.content} />}
          </div>
        );
      case "audio":
        return (
          <audio 
            src={message.media_url || ""} 
            controls 
            className="max-w-full"
          />
        );
      case "document":
        return (
          <div className="flex items-center gap-3 p-2 bg-background/20 rounded-md border border-foreground/10">
            <div className="p-2 bg-background/40 rounded-full">
              <FileIcon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{message.content || message.media_filename}</p>
              <p className="text-[10px] opacity-60">Document</p>
            </div>
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-8 w-8"
              onClick={() => window.open(message.media_url || "", "_blank")}
            >
              <DownloadIcon className="h-4 w-4" />
            </Button>
          </div>
        );
      default:
        return <WaMarkdown content={message.content} />;
    }
  };

  return (
    <div
      className={cn(
        "flex w-full mb-1",
        isOutgoing ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[75%] px-3 py-2 text-sm shadow-sm relative",
          isOutgoing
            ? "bg-primary text-primary-foreground rounded-l-lg rounded-tr-lg"
            : "bg-muted text-foreground rounded-r-lg rounded-tl-lg"
        )}
      >
        {!isOutgoing && (
          <p className="text-[11px] font-semibold mb-1 text-primary/80">
            {message.sender_name || (message.sender_jid ? message.sender_jid.split("@")[0] : "")}
          </p>
        )}
        <div className="break-words">
          {renderContent()}
        </div>
        <div
          className={cn(
            "flex items-center gap-1 mt-1",
            isOutgoing ? "justify-end" : "justify-start"
          )}
        >
          <span className="text-[10px] opacity-60">
            {formatTime(message.sent_at)}
          </span>
          {isOutgoing && <StatusIcon status={message.status} />}
        </div>
      </div>
    </div>
  );
}
