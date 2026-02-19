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
import { FileTextIcon, Loader2Icon, PlusIcon, XIcon } from "lucide-react";
import type { MessageTemplate } from "@/lib/types";
import { useEffect, useState } from "react";

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

  const contentValue = form.watch("content");

  const renderPreview = (text: string) => {
    if (!text) return "Your message preview will appear here...";
    return text.replace(/{{(\w+)}}/g, (_, name) => `[${name}]`);
  };

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
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Hello {{name}}, your order #{{order_id}} is confirmed."
                      className="min-h-[100px] resize-none"
                      {...field}
                    />
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

            {/* Preview */}
            {contentValue && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Preview</label>
                <div className="rounded-md border bg-muted/30 p-3">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {renderPreview(contentValue)}
                  </p>
                </div>
              </div>
            )}

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
      </DialogContent>
    </Dialog>
  );
}
