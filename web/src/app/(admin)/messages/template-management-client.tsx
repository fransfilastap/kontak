"use client";

import { useState } from "react";
import type { MessageTemplate } from "@/lib/types";
import { TemplateCard } from "@/app/(admin)/messages/template-card";
import { CreateTemplateDialog } from "@/app/(admin)/messages/create-template-dialog";
import { DeleteTemplateDialog } from "@/app/(admin)/messages/delete-template-dialog";
import { Button } from "@/components/ui/button";
import { FileTextIcon, HashIcon, PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";

interface TemplateManagementClientProps {
  templates: MessageTemplate[];
}

export function TemplateManagementClient({
  templates,
}: TemplateManagementClientProps) {
  const router = useRouter();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] =
    useState<MessageTemplate | null>(null);
  const [deletingTemplate, setDeletingTemplate] =
    useState<MessageTemplate | null>(null);

  const totalTemplates = templates.length;
  const withVariables = templates.filter(
    (t) => Array.isArray(t.variables) && t.variables.length > 0
  ).length;

  const handleEdit = (template: MessageTemplate) => {
    setEditingTemplate(template);
  };

  const handleDuplicate = (template: MessageTemplate) => {
    setEditingTemplate({
      ...template,
      id: "",
      name: `${template.name} (Copy)`,
    });
    setShowCreateDialog(true);
  };

  const handleDelete = (template: MessageTemplate) => {
    setDeletingTemplate(template);
  };

  const handleSuccess = () => {
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Message Templates
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage reusable message templates with variables
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex items-center gap-4 rounded-lg border bg-card p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <FileTextIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{totalTemplates}</p>
            <p className="text-xs text-muted-foreground">Total Templates</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-lg border bg-card p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-950">
            <HashIcon className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">
              {withVariables}
            </p>
            <p className="text-xs text-muted-foreground">With Variables</p>
          </div>
        </div>
      </div>

      {/* Template Grid */}
      {totalTemplates === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
            <FileTextIcon className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-1">No templates yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first message template to get started
          </p>
          <Button onClick={() => setShowCreateDialog(true)}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Template
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onEdit={handleEdit}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <CreateTemplateDialog
        open={showCreateDialog || !!editingTemplate}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateDialog(false);
            setEditingTemplate(null);
          }
        }}
        onSuccess={handleSuccess}
        template={editingTemplate}
      />

      {/* Delete Dialog */}
      <DeleteTemplateDialog
        open={!!deletingTemplate}
        onOpenChange={(open) => !open && setDeletingTemplate(null)}
        onSuccess={handleSuccess}
        template={deletingTemplate}
      />
    </div>
  );
}
