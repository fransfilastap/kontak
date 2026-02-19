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
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAction } from "next-safe-action/hooks";
import { registerDevice } from "@/app/(admin)/register-device/action";
import { toast } from "sonner";
import { Loader2Icon, PlusIcon } from "lucide-react";

const addDeviceSchema = z.object({
    name: z.string().min(1, "Device name is required"),
    mobile_number: z
        .string()
        .min(1, "WhatsApp number is required")
        .regex(/^\d+$/, "Only digits allowed"),
});

type AddDeviceFormValues = z.infer<typeof addDeviceSchema>;

interface AddDeviceDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function AddDeviceDialog({
    open,
    onOpenChange,
    onSuccess,
}: AddDeviceDialogProps) {
    const form = useForm<AddDeviceFormValues>({
        resolver: zodResolver(addDeviceSchema),
        defaultValues: {
            name: "",
            mobile_number: "",
        },
    });

    const { executeAsync, isExecuting } = useAction(registerDevice);

    const onSubmit = async (data: AddDeviceFormValues) => {
        const response = await executeAsync(data);

        if (response?.data?.success) {
            toast.success("Device registered successfully");
            form.reset();
            onOpenChange(false);
            onSuccess?.();
        } else {
            toast.error("Failed to register device");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <PlusIcon className="h-5 w-5" />
                        Add Device
                    </DialogTitle>
                    <DialogDescription>
                        Register a new WhatsApp device to your gateway.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Device Name</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="e.g. Marketing Bot"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="mobile_number"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>WhatsApp Number</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="e.g. 628123456789"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

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
                                        Registering...
                                    </>
                                ) : (
                                    "Register Device"
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
