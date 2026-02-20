"use client";

import type { MessageLog } from "@/lib/types";
import { WaMarkdown } from "./wa-markdown";
import { CheckIcon, CheckCheckIcon, ImageIcon, FileIcon, VideoIcon, MusicIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  message: MessageLog;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function StatusIcon({ status }: { status: string }) {
  if (status === "read") {
    return <CheckCheckIcon className="h-3 w-3 text-blue-500" />;
  }
  if (status === "delivered") {
    return <CheckCheckIcon className="h-3 w-3 text-muted-foreground/70" />;
  }
  return <CheckIcon className="h-3 w-3 text-muted-foreground/70" />;
}

function MediaAttachment({ message }: { message: MessageLog }) {
  const type = message.message_type;
  const filename = message.media_filename || message.content;
  const hasUrl = !!message.media_url;

  if (type === "image") {
    if (hasUrl) {
      return (
        <a 
          href={message.media_url || '#'} 
          target="_blank" 
          rel="noopener noreferrer"
          className="block mb-1 overflow-hidden rounded-md border bg-muted/50 max-w-sm"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={message.media_url || ''} 
            alt={filename} 
            className="w-full h-auto object-cover max-h-[300px]"
            loading="lazy"
          />
        </a>
      );
    }
    return (
      <div className="flex items-center gap-2 rounded-md bg-background/50 px-2.5 py-2 mb-1">
        <ImageIcon className="h-4 w-4 shrink-0 text-blue-500" />
        <span className="text-xs truncate">{filename}</span>
      </div>
    );
  }

  if (type === "video") {
    if (hasUrl) {
      return (
        <div className="mb-1 overflow-hidden rounded-md border bg-black max-w-sm">
          <video 
            src={message.media_url || ''} 
            controls 
            className="w-full h-auto max-h-[300px]"
            preload="metadata"
          >
            <track kind="captions" />
          </video>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2 rounded-md bg-background/50 px-2.5 py-2 mb-1">
        <VideoIcon className="h-4 w-4 shrink-0 text-purple-500" />
        <span className="text-xs truncate">{filename}</span>
      </div>
    );
  }

  if (type === "audio") {
    if (hasUrl) {
      return (
        <div className="mb-1 rounded-md border bg-muted/30 p-2 max-w-sm">
           <audio 
            src={message.media_url || ''} 
            controls 
            className="w-full h-10"
            preload="metadata"
          >
            <track kind="captions" />
          </audio>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2 rounded-md bg-background/50 px-2.5 py-2 mb-1">
        <MusicIcon className="h-4 w-4 shrink-0 text-orange-500" />
        <span className="text-xs truncate">{filename}</span>
      </div>
    );
  }

  if (type === "document" || hasUrl) {
    return (
      <a 
        href={message.media_url || '#'} 
        target="_blank" 
        rel="noopener noreferrer"
        download={filename}
        className="flex items-center gap-2 rounded-md bg-background/50 px-2.5 py-2 mb-1 hover:bg-background/80 transition-colors cursor-pointer border shadow-sm"
      >
        <FileIcon className="h-4 w-4 shrink-0 text-emerald-500" />
        <span className="text-xs truncate font-medium hover:underline">{filename}</span>
      </a>
    );
  }

  return null;
}

function getSenderDisplayName(message: MessageLog): string | null {
  if (message.direction === "outgoing") return null;
  if (message.sender_name) return message.sender_name;
  if (message.sender_jid) return message.sender_jid.split("@")[0];
  return null;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isOutgoing = message.direction === "outgoing";
  const isMedia = message.message_type !== "text";
  const senderName = getSenderDisplayName(message);

  return (
    <div
      className={cn(
        "flex w-full",
        isOutgoing ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "relative max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm",
          isOutgoing
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-card border rounded-bl-md"
        )}
      >
        {senderName && (
          <p className={cn(
            "text-xs font-semibold mb-0.5",
            isOutgoing ? "text-primary-foreground/80" : "text-primary"
          )}>
            {senderName}
          </p>
        )}
        {isMedia && <MediaAttachment message={message} />}
        {message.content && (message.message_type === "text" || (isMedia && message.content !== message.media_filename)) && (
          <div>
            <WaMarkdown content={message.content} />
          </div>
        )}
        <div className="flex items-center gap-1 mt-0.5 justify-end">
          <span className={cn(
            "text-[10px]",
            isOutgoing ? "text-primary-foreground/50" : "text-muted-foreground"
          )}>
            {formatTime(message.sent_at)}
          </span>
          {isOutgoing && <StatusIcon status={message.status} />}
        </div>
      </div>
    </div>
  );
}

export function DateSeparator({ date }: { date: string }) {
  return (
    <div className="flex items-center justify-center py-2">
      <span className="rounded-full bg-muted px-3 py-1 text-[11px] text-muted-foreground font-medium">
        {date}
      </span>
    </div>
  );
}
