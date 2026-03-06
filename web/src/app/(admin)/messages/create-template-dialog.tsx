"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAction } from "next-safe-action/hooks";
import {
  createTemplate,
  updateTemplate,
} from "@/app/(admin)/messages/actions";
import { toast } from "sonner";
import {
  FileTextIcon,
  Loader2Icon,
  PlusIcon,
  XIcon,
  BoldIcon,
  ItalicIcon,
  StrikethroughIcon,
  CodeIcon,
  QuoteIcon,
  EyeIcon,
  PenLineIcon,
} from "lucide-react";
import type { MessageTemplate } from "@/lib/types";
import { useEffect, useState, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WaMarkdown } from "../inbox/wa-markdown";

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

  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    "value"
  )?.set;
  nativeInputValueSetter?.call(
    textarea,
    text.slice(0, start) + replacement + text.slice(end)
  );
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  textarea.focus();
  textarea.setSelectionRange(
    start + prefix.length,
    start + prefix.length + selected.length
  );
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
  nativeInputValueSetter?.call(
    textarea,
    text.slice(0, start) + replacement + text.slice(end)
  );
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  textarea.focus();
}

const templateFormSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  content: z.string().min(1, "Template content is required"),
});

type TemplateFormValues = z.infer<typeof templateFormSchema>;

interface CreateTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  template?: MessageTemplate | null;
}

export function CreateTemplateDialog({
  open,
  onOpenChange,
  onSuccess,
  template,
}: CreateTemplateDialogProps) {
  const isEditing = !!template;
  const [variables, setVariables] = useState<string[]>([]);
  const [variableInput, setVariableInput] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: "",
      content: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (template) {
        form.reset({
          name: template.name,
          content: template.content,
        });
        setVariables(template.variables ?? []);
      } else {
        form.reset({ name: "", content: "" });
        setVariables([]);
      }
      setVariableInput("");
    }
  }, [open, template, form]);

  const { executeAsync: executeCreate, isExecuting: isCreating } =
    useAction(createTemplate);
  const { executeAsync: executeUpdate, isExecuting: isUpdating } =
    useAction(updateTemplate);

  const isExecuting = isCreating || isUpdating;

  const addVariable = () => {
    const trimmed = variableInput.trim();
    if (trimmed && !variables.includes(trimmed)) {
      setVariables([...variables, trimmed]);
      setVariableInput("");
    }
  };

  const removeVariable = (variable: string) => {
    setVariables(variables.filter((v) => v !== variable));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addVariable();
    }
  };

  const onSubmit = async (data: TemplateFormValues) => {
    if (isEditing && template) {
      const response = await executeUpdate({
        id: template.id,
        ...data,
        variables,
      });
      if (response?.data && !("failure" in response.data)) {
        toast.success("Template updated successfully");
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error("Failed to update template");
      }
    } else {
      const response = await executeCreate({ ...data, variables });
      if (response?.data && !("failure" in response.data)) {
        toast.success("Template created successfully");
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error("Failed to create template");
      }
    }
  };

  const renderPreview = (text: string) => {
    if (!text) return "Your message preview will appear here...";
    return text.replace(/{{(\w+)}}/g, (_, name) => `[${name}]`);
  };

  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const ta = textareaRef.current;
    if (!ta) return;

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
    { icon: BoldIcon, label: "Bold (Ctrl+B)", action: () => textareaRef.current && wrapSelection(textareaRef.current, "*", "*") },
    { icon: ItalicIcon, label: "Italic (Ctrl+I)", action: () => textareaRef.current && wrapSelection(textareaRef.current, "_", "_") },
    { icon: StrikethroughIcon, label: "Strikethrough", action: () => textareaRef.current && wrapSelection(textareaRef.current, "~", "~") },
    { icon: CodeIcon, label: "Monospace", action: () => textareaRef.current && wrapSelection(textareaRef.current, "```", "```") },
    { icon: QuoteIcon, label: "Quote", action: () => textareaRef.current && prependLines(textareaRef.current, "> ") },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileTextIcon className="h-5 w-5" />
            {isEditing ? "Edit Template" : "Create Template"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update your message template."
              : "Create a reusable message template with variables."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4 -mr-4">
          <div className="px-1 pb-2">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Template Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Welcome Message" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Content</FormLabel>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-0.5">
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
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 text-xs px-2"
                        onClick={() => setShowPreview(!showPreview)}
                        type="button"
                      >
                        {showPreview ? (
                          <>
                            <PenLineIcon className="h-3.5 w-3.5" />
                            Edit
                          </>
                        ) : (
                          <>
                            <EyeIcon className="h-3.5 w-3.5" />
                            Preview
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  <FormControl>
                    {showPreview ? (
                      <div className="rounded-md border p-3 overflow-auto min-h-[120px] max-h-[240px] bg-muted/30">
                        {field.value ? (
                          <WaMarkdown content={renderPreview(field.value)} />
                        ) : (
                          <p className="text-sm text-muted-foreground italic">
                            Nothing to preview
                          </p>
                        )}
                      </div>
                    ) : (
                      <Textarea
                        placeholder="Hello {{name}}, your order #{{order_id}} is confirmed."
                        className="min-h-[120px] max-h-[240px] resize-none font-mono text-sm"
                        {...field}
                        ref={(e) => {
                          field.ref(e);
                          if (e) textareaRef.current = e;
                        }}
                        onKeyDown={(e) => {
                          handleEditorKeyDown(e);
                          if (e.defaultPrevented) return;
                          // react-hook-form doesn't specifically need onKeyDown unless passed, but we handle it safely
                        }}
                      />
                    )}
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    {"Use {{variable_name}} to insert dynamic values."}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Variables */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Variables</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a variable name"
                  value={variableInput}
                  onChange={(e) => setVariableInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={addVariable}
                >
                  <PlusIcon className="h-4 w-4" />
                </Button>
              </div>
              {variables.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {variables.map((variable) => (
                    <Badge
                      key={variable}
                      variant="outline"
                      className="text-xs border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-300 gap-1"
                    >
                      {variable}
                      <button
                        type="button"
                        onClick={() => removeVariable(variable)}
                        className="ml-0.5 hover:text-destructive"
                      >
                        <XIcon className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Removed standalone preview, integrated into the Content block */}
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isExecuting}>
                {isExecuting ? (
                  <>
                    <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                    {isEditing ? "Updating..." : "Creating..."}
                  </>
                ) : isEditing ? (
                  "Update Template"
                ) : (
                  "Create Template"
                )}
              </Button>
            </DialogFooter>
              </form>
            </Form>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
