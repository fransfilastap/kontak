"use client";

import { useState } from "react";
import type { KontakClient } from "@/lib/types";
import { DeviceCard } from "@/app/(admin)/clients/device-card";
import { QRPairingDialog } from "@/app/(admin)/clients/qr-pairing-dialog";
import { AddDeviceDialog } from "@/app/(admin)/clients/add-device-dialog";
import { Button } from "@/components/ui/button";
import {
    PlusIcon,
    SmartphoneIcon,
    WifiIcon,
    WifiOffIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface DeviceManagementClientProps {
    devices: KontakClient[];
}

export function DeviceManagementClient({
    devices,
}: DeviceManagementClientProps) {
    const router = useRouter();
    const [pairingDevice, setPairingDevice] = useState<KontakClient | null>(null);
    const [showAddDialog, setShowAddDialog] = useState(false);

    const totalDevices = devices.length;
    const connectedDevices = devices.filter((d) => d.is_connected).length;
    const disconnectedDevices = totalDevices - connectedDevices;

    const handlePairDevice = (device: KontakClient) => {
        setPairingDevice(device);
    };

    const handleAddSuccess = () => {
        router.refresh();
    };

    return (
        <div className="flex flex-col gap-6 p-4 lg:p-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        Device Management
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Manage and monitor your WhatsApp gateway devices
                    </p>
                </div>
                <Button onClick={() => setShowAddDialog(true)}>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Add Device
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-center gap-4 rounded-lg border bg-card p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <SmartphoneIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{totalDevices}</p>
                        <p className="text-xs text-muted-foreground">Total Devices</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 rounded-lg border bg-card p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950">
                        <WifiIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                            {connectedDevices}
                        </p>
                        <p className="text-xs text-muted-foreground">Connected</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 rounded-lg border bg-card p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                        <WifiOffIcon className="h-5 w-5 text-zinc-500" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-zinc-500">
                            {disconnectedDevices}
                        </p>
                        <p className="text-xs text-muted-foreground">Disconnected</p>
                    </div>
                </div>
            </div>

            {/* Device Grid */}
            {totalDevices === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 py-16">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                        <SmartphoneIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-lg mb-1">No devices yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        Add your first WhatsApp device to get started
                    </p>
                    <Button onClick={() => setShowAddDialog(true)}>
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Add Device
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {devices.map((device) => (
                        <DeviceCard
                            key={device.id}
                            device={device}
                            onPairDevice={handlePairDevice}
                        />
                    ))}
                </div>
            )}

            {/* Dialogs */}
            <QRPairingDialog
                open={!!pairingDevice}
                onOpenChange={(open) => !open && setPairingDevice(null)}
                clientId={pairingDevice?.id ?? null}
                deviceName={pairingDevice?.name ?? ""}
            />

            <AddDeviceDialog
                open={showAddDialog}
                onOpenChange={setShowAddDialog}
                onSuccess={handleAddSuccess}
            />
        </div>
    );
}
