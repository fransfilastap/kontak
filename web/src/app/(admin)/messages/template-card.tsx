"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { MessageTemplate } from "@/lib/types";
import {
  CopyIcon,
  FileTextIcon,
  MoreVerticalIcon,
  PencilIcon,
  TrashIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TemplateCardProps {
  template: MessageTemplate;
  onEdit: (template: MessageTemplate) => void;
  onDuplicate: (template: MessageTemplate) => void;
  onDelete: (template: MessageTemplate) => void;
}

function highlightVariables(content: string) {
  const parts = content.split(/({{[^}]+}})/g);
  return parts.map((part, i) => {
    if (part.match(/^{{[^}]+}}$/)) {
      return (
        <span
          key={i}
          className="inline-block rounded bg-violet-100 px-1 text-violet-700 dark:bg-violet-950 dark:text-violet-300 font-mono text-xs"
        >
          {part}
        </span>
      );
    }
    return part;
  });
}

export function TemplateCard({
  template,
  onEdit,
  onDuplicate,
  onDelete,
}: TemplateCardProps) {
  const truncatedContent =
    template.content.length > 120
      ? template.content.slice(0, 120) + "..."
      : template.content;

  const createdDate = new Date(template.created_at).toLocaleDateString(
    "en-US",
    { month: "short", day: "numeric", year: "numeric" }
  );

  return (
    <Card className="group relative overflow-hidden transition-all duration-200 hover:shadow-md hover:border-primary/20">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-violet-500" />

      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400">
              <FileTextIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm leading-tight">
                {template.name}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Created {createdDate}
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVerticalIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onEdit(template)}>
                <PencilIcon className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate(template)}>
                <CopyIcon className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(template)}
                className="text-destructive focus:text-destructive"
              >
                <TrashIcon className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Content Preview */}
        <div className="rounded-md border bg-muted/30 p-3 mb-3">
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">
            {highlightVariables(truncatedContent)}
          </p>
        </div>

        {/* Variables */}
        {Array.isArray(template.variables) && template.variables.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {template.variables.map((variable) => (
              <Badge
                key={variable}
                variant="outline"
                className="text-xs font-medium border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-300"
              >
                {variable}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
