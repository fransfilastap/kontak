"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { QRCodeCanvas } from "qrcode.react";
import type { QRCodeResponse } from "@/lib/types";
import fetcher from "@/lib/swr";
import useSWR from "swr";
import {
    CheckCircle2Icon,
    Loader2Icon,
    SmartphoneIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface QRPairingDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    clientId: string | null;
    deviceName: string;
}

export function QRPairingDialog({
    open,
    onOpenChange,
    clientId,
    deviceName,
}: QRPairingDialogProps) {
    const { data, isLoading, error } = useSWR<QRCodeResponse>(
        open && clientId ? `/api/kontak/qr/${clientId}` : null,
        fetcher,
        {
            refreshInterval: 15000,
            revalidateOnFocus: true,
        }
    );

    const isConnected = data?.is_connected;
    const qrCode = data?.code;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <SmartphoneIcon className="h-5 w-5" />
                        Pair Device
                    </DialogTitle>
                    <DialogDescription>
                        Scan the QR code with WhatsApp on{" "}
                        <span className="font-medium text-foreground">{deviceName}</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col items-center gap-6 py-4">
                    {/* QR / Status Area */}
                    <div className="relative flex items-center justify-center w-[280px] h-[280px] rounded-2xl bg-white border shadow-sm">
                        {isLoading ? (
                            <div className="flex flex-col items-center gap-3 text-muted-foreground">
                                <Loader2Icon className="h-8 w-8 animate-spin" />
                                <p className="text-sm">Generating QR code...</p>
                            </div>
                        ) : isConnected ? (
                            <div className="flex flex-col items-center gap-3 animate-in fade-in-0 zoom-in-95 duration-300">
                                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                                    <CheckCircle2Icon className="h-10 w-10 text-emerald-600" />
                                </div>
                                <div className="text-center">
                                    <p className="font-semibold text-emerald-700">
                                        Device Connected!
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        WhatsApp is now linked
                                    </p>
                                </div>
                            </div>
                        ) : error ? (
                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                <p className="text-sm font-medium text-destructive">
                                    Failed to load QR
                                </p>
                                <p className="text-xs">Please try again</p>
                            </div>
                        ) : (
                            <div className="p-4">
                                <QRCodeCanvas
                                    value={qrCode ?? ""}
                                    size={240}
                                    level="M"
                                    includeMargin={false}
                                    bgColor="#ffffff"
                                    fgColor="#000000"
                                />
                            </div>
                        )}
                    </div>

                    {/* Instructions */}
                    {!isConnected && (
                        <div className="w-full space-y-3">
                            <div className="flex items-start gap-3">
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                                    1
                                </span>
                                <p className="text-sm text-muted-foreground">
                                    Open <span className="font-medium text-foreground">WhatsApp</span> on your phone
                                </p>
                            </div>
                            <div className="flex items-start gap-3">
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                                    2
                                </span>
                                <p className="text-sm text-muted-foreground">
                                    Tap{" "}
                                    <span className="font-medium text-foreground">
                                        Menu (⋮)
                                    </span>{" "}
                                    or{" "}
                                    <span className="font-medium text-foreground">Settings</span>{" "}
                                    → <span className="font-medium text-foreground">Linked Devices</span>
                                </p>
                            </div>
                            <div className="flex items-start gap-3">
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                                    3
                                </span>
                                <p className="text-sm text-muted-foreground">
                                    Tap{" "}
                                    <span className="font-medium text-foreground">
                                        Link a Device
                                    </span>{" "}
                                    and scan this QR code
                                </p>
                            </div>
                        </div>
                    )}

                    {isConnected && (
                        <Button
                            onClick={() => onOpenChange(false)}
                            className="w-full"
                        >
                            Done
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
