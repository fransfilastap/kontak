"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ConnectionStatusResponse, KontakClient } from "@/lib/types";
import fetcher from "@/lib/swr";
import {
    LinkIcon,
    MoreVerticalIcon,
    QrCodeIcon,
    SmartphoneIcon,
    UnlinkIcon,
    WifiIcon,
    WifiOffIcon,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useKontak } from "@/app/providers/kontak-providers";
import useSWR from "swr";

interface DeviceCardProps {
    device: KontakClient;
    onPairDevice: (device: KontakClient) => void;
}

export function DeviceCard({ device, onPairDevice }: DeviceCardProps) {
    const { connectDevice, disconnectDevice, isConnecting, isDisconnecting } =
        useKontak();

    const { data: statusData } = useSWR<ConnectionStatusResponse>(
        `/api/kontak/status?clientId=${device.id}`,
        fetcher,
        { refreshInterval: 15000 }
    );

    const isConnected = statusData?.is_connected ?? device.is_connected;

    return (
        <Card className="group relative overflow-hidden transition-all duration-200 hover:shadow-md hover:border-primary/20">
            {/* Status accent bar */}
            <div
                className={`absolute top-0 left-0 right-0 h-0.5 transition-colors ${isConnected
                    ? "bg-emerald-500"
                    : "bg-zinc-300 dark:bg-zinc-700"
                    }`}
            />

            <CardContent className="p-5">
                {/* Header row */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div
                            className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${isConnected
                                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
                                : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                                }`}
                        >
                            <SmartphoneIcon className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-sm leading-tight">
                                {device.name}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {device.whatsapp_number || "No number assigned"}
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
                            <DropdownMenuItem onClick={() => onPairDevice(device)}>
                                <QrCodeIcon className="h-4 w-4 mr-2" />
                                QR Pairing
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {device.jid && !isConnected && (
                                <DropdownMenuItem
                                    onClick={() => connectDevice(device.id)}
                                    disabled={isConnecting}
                                >
                                    <LinkIcon className="h-4 w-4 mr-2" />
                                    {isConnecting ? "Connecting..." : "Connect"}
                                </DropdownMenuItem>
                            )}
                            {isConnected && (
                                <DropdownMenuItem
                                    onClick={() => disconnectDevice(device.id)}
                                    disabled={isDisconnecting}
                                    className="text-destructive focus:text-destructive"
                                >
                                    <UnlinkIcon className="h-4 w-4 mr-2" />
                                    {isDisconnecting ? "Disconnecting..." : "Disconnect"}
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Status + Actions */}
                <div className="flex items-center justify-between">
                    <Badge
                        variant="outline"
                        className={`text-xs font-medium ${isConnected
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
                            : "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400"
                            }`}
                    >
                        {isConnected ? (
                            <>
                                <WifiIcon className="h-3 w-3 mr-1" />
                                Connected
                            </>
                        ) : (
                            <>
                                <WifiOffIcon className="h-3 w-3 mr-1" />
                                Disconnected
                            </>
                        )}
                    </Badge>

                    {!isConnected && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => onPairDevice(device)}
                        >
                            <QrCodeIcon className="h-3 w-3 mr-1" />
                            Pair
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
