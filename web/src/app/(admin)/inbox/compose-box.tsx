"use client";

import { useRef, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SendHorizontalIcon, BoldIcon, ItalicIcon, StrikethroughIcon, CodeIcon, QuoteIcon, PaperclipIcon, XIcon } from "lucide-react";

interface ComposeBoxProps {
  onSend: (text: string) => void;
  onSendMedia?: (file: File) => void;
  disabled?: boolean;
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

  // Use native setter to trigger React's onChange
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    "value"
  )?.set;
  nativeInputValueSetter?.call(textarea, text.slice(0, start) + replacement + text.slice(end));
  textarea.dispatchEvent(new Event("input", { bubbles: true }));

  // Restore cursor position
  textarea.focus();
  textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
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
  nativeInputValueSetter?.call(textarea, text.slice(0, start) + replacement + text.slice(end));
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  textarea.focus();
}

export function ComposeBox({ onSend, onSendMedia, disabled }: ComposeBoxProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const handleSend = useCallback(() => {
    if (pendingFile && onSendMedia) {
      onSendMedia(pendingFile);
      setPendingFile(null);
      return;
    }
    const value = textareaRef.current?.value.trim();
    if (!value) return;
    onSend(value);
    if (textareaRef.current) {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        "value"
      )?.set;
      nativeInputValueSetter?.call(textareaRef.current, "");
      textareaRef.current.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }, [onSend, onSendMedia, pendingFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPendingFile(file);
    }
    // Reset input so the same file can be re-selected
    e.target.value = "";
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const ta = textareaRef.current;
    if (!ta) return;

    // Send on Enter (without Shift)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
      return;
    }

    // Keyboard shortcuts
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
      }
    }
  };

  const toolbarButtons = [
    { icon: BoldIcon, label: "Bold", action: () => textareaRef.current && wrapSelection(textareaRef.current, "*", "*") },
    { icon: ItalicIcon, label: "Italic", action: () => textareaRef.current && wrapSelection(textareaRef.current, "_", "_") },
    { icon: StrikethroughIcon, label: "Strikethrough", action: () => textareaRef.current && wrapSelection(textareaRef.current, "~", "~") },
    { icon: CodeIcon, label: "Monospace", action: () => textareaRef.current && wrapSelection(textareaRef.current, "```", "```") },
    { icon: QuoteIcon, label: "Quote", action: () => textareaRef.current && prependLines(textareaRef.current, "> ") },
  ];

  return (
    <div className="border-t bg-background p-3">
      {pendingFile && (
        <div className="flex items-center gap-2 mb-2 rounded-md border bg-muted/50 px-3 py-2">
          <PaperclipIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="text-sm truncate flex-1">{pendingFile.name}</span>
          <span className="text-xs text-muted-foreground shrink-0">
            {(pendingFile.size / 1024).toFixed(0)} KB
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setPendingFile(null)}
            type="button"
          >
            <XIcon className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
      <div className="flex items-center gap-1 mb-2">
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
      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
        />
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          title="Attach file"
          type="button"
        >
          <PaperclipIcon className="h-4 w-4" />
        </Button>
        <Textarea
          ref={textareaRef}
          placeholder="Type a message..."
          className="min-h-[40px] max-h-[120px] resize-none"
          rows={1}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={disabled}
          className="shrink-0"
        >
          <SendHorizontalIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
