"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2Icon, BellIcon, BellOffIcon } from "lucide-react";
import fetcher from "@/lib/swr";
import useSWR from "swr";

interface SubscriptionsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    clientId: string | null;
    deviceName: string;
}

const EVENT_CATEGORIES = [
    {
        name: "Messages",
        events: [
            { key: "message", label: "Incoming Messages" },
            { key: "fb_message", label: "Facebook Messages" },
            { key: "receipt", label: "Receipts (Delivery/Read)" },
            { key: "chat_presence", label: "Typing Indicators" },
            { key: "history_sync", label: "Message History Sync" },
            { key: "undecryptable_message", label: "Undecryptable Messages" },
        ],
    },
    {
        name: "Connection",
        events: [
            { key: "connected", label: "Connected" },
            { key: "disconnected", label: "Disconnected" },
            { key: "logged_out", label: "Logged Out" },
            { key: "pair_success", label: "Pair Success" },
            { key: "pair_error", label: "Pair Error" },
            { key: "stream_replaced", label: "Stream Replaced" },
            { key: "connect_failure", label: "Connection Failure" },
            { key: "client_outdated", label: "Client Outdated" },
        ],
    },
    {
        name: "Presence",
        events: [
            { key: "presence", label: "Presence Updates" },
            { key: "app_state_sync_complete", label: "App State Sync" },
        ],
    },
    {
        name: "Groups",
        events: [
            { key: "joined_group", label: "Joined Groups" },
            { key: "group_info", label: "Group Info Changes" },
        ],
    },
    {
        name: "User",
        events: [
            { key: "picture", label: "Profile Picture Changes" },
            { key: "user_about", label: "About Status Changes" },
            { key: "identity_change", label: "Identity Changes" },
        ],
    },
    {
        name: "Other",
        events: [
            { key: "newsletter_join", label: "Newsletter Join" },
            { key: "newsletter_leave", label: "Newsletter Leave" },
            { key: "newsletter_live_update", label: "Newsletter Live Updates" },
            { key: "blocklist", label: "Blocklist Changes" },
            { key: "privacy_settings", label: "Privacy Settings" },
            { key: "media_retry", label: "Media Retry" },
            { key: "offline_sync_preview", label: "Offline Sync Preview" },
            { key: "offline_sync_completed", label: "Offline Sync Completed" },
        ],
    },
];

export function SubscriptionsDialog({
    open,
    onOpenChange,
    clientId,
    deviceName,
}: SubscriptionsDialogProps) {
    const [subscriptions, setSubscriptions] = useState<Record<string, boolean>>({});
    const [isSaving, setIsSaving] = useState(false);

    const { data, isLoading } = useSWR<Record<string, boolean>>(
        clientId ? `/api/kontak/clients/${clientId}/subscriptions` : null,
        fetcher,
        {
            onSuccess: (data) => {
                setSubscriptions(data);
            },
            revalidateOnFocus: false,
        }
    );

    useEffect(() => {
        if (data && open) {
            setSubscriptions(data);
        }
    }, [data, open]);

    const handleToggle = (eventKey: string) => {
        setSubscriptions((prev) => ({
            ...prev,
            [eventKey]: !prev[eventKey],
        }));
    };

    const handleSave = async () => {
        if (!clientId) return;

        setIsSaving(true);
        try {
            const response = await fetch(
                `/api/kontak/clients/${clientId}/subscriptions`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ subscriptions }),
                }
            );

            if (!response.ok) {
                throw new Error("Failed to save subscriptions");
            }

            toast.success("Subscriptions updated successfully");
            onOpenChange(false);
        } catch (error) {
            toast.error("Failed to save subscriptions");
        } finally {
            setIsSaving(false);
        }
    };

    const enabledCount = Object.values(subscriptions).filter(Boolean).length;
    const totalCount = EVENT_CATEGORIES.reduce(
        (acc, cat) => acc + cat.events.length,
        0
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BellIcon className="h-5 w-5" />
                        Event Subscriptions
                    </DialogTitle>
                    <DialogDescription>
                        Configure which events to receive for {deviceName}. Events
                        not listed below are enabled by default.
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2Icon className="h-6 w-6 animate-spin" />
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto py-4 space-y-6">
                        {EVENT_CATEGORIES.map((category) => (
                            <div key={category.name}>
                                <h4 className="text-sm font-semibold mb-3 text-muted-foreground">
                                    {category.name}
                                </h4>
                                <div className="space-y-3">
                                    {category.events.map((event) => {
                                        const isEnabled =
                                            subscriptions[event.key] !== false;
                                        return (
                                            <div
                                                key={event.key}
                                                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                                            >
                                                <Label
                                                    htmlFor={event.key}
                                                    className="text-sm font-medium cursor-pointer"
                                                >
                                                    {event.label}
                                                </Label>
                                                <Switch
                                                    id={event.key}
                                                    checked={isEnabled}
                                                    onCheckedChange={() =>
                                                        handleToggle(event.key)
                                                    }
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <DialogFooter className="flex-row justify-between items-center">
                    <div className="text-sm text-muted-foreground">
                        {enabledCount} of {totalCount} events enabled
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                            <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving && (
                                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Save Changes
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}