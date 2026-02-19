"use client";

import React from "react";

interface WaMarkdownProps {
  content: string;
}

function parseWaMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const result: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Blockquote
    if (line.startsWith("> ")) {
      result.push(
        <blockquote
          key={`bq-${i}`}
          className="border-l-4 border-muted-foreground/30 pl-3 italic text-muted-foreground"
        >
          {parseInline(line.slice(2))}
        </blockquote>
      );
    } else {
      result.push(<span key={`line-${i}`}>{parseInline(line)}</span>);
    }

    if (i < lines.length - 1) {
      result.push(<br key={`br-${i}`} />);
    }
  }

  return result;
}

function parseInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Order matters: monospace first (``` ```) then bold, italic, strikethrough
  const regex = /```(.*?)```|\*([^*]+)\*|_([^_]+)_|~([^~]+)~/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    if (match[1] !== undefined) {
      nodes.push(
        <code key={key++} className="rounded bg-muted px-1 py-0.5 font-mono text-sm">
          {match[1]}
        </code>
      );
    } else if (match[2] !== undefined) {
      nodes.push(<strong key={key++}>{match[2]}</strong>);
    } else if (match[3] !== undefined) {
      nodes.push(<em key={key++}>{match[3]}</em>);
    } else if (match[4] !== undefined) {
      nodes.push(<del key={key++}>{match[4]}</del>);
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

export function WaMarkdown({ content }: WaMarkdownProps) {
  return <span className="whitespace-pre-wrap break-words">{parseWaMarkdown(content)}</span>;
}
