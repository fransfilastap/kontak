"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAction } from "next-safe-action/hooks";
import { deleteTemplate } from "@/app/(admin)/messages/actions";
import { toast } from "sonner";
import type { MessageTemplate } from "@/lib/types";
import { Loader2Icon } from "lucide-react";

interface DeleteTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  template: MessageTemplate | null;
}

export function DeleteTemplateDialog({
  open,
  onOpenChange,
  onSuccess,
  template,
}: DeleteTemplateDialogProps) {
  const { executeAsync, isExecuting } = useAction(deleteTemplate);

  const handleDelete = async () => {
    if (!template) return;

    const response = await executeAsync({ id: template.id });
    if (response?.data && !("failure" in response.data)) {
      toast.success("Template deleted successfully");
      onOpenChange(false);
      onSuccess?.();
    } else {
      toast.error("Failed to delete template");
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Template</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete{" "}
            <span className="font-semibold text-foreground">
              {template?.name}
            </span>
            ? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isExecuting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isExecuting ? (
              <>
                <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
