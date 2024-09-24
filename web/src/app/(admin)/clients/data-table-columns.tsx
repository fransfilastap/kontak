"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { ConnectionStatusResponse, KontakClient } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import useSWR from "swr";
import fetcher from "@/lib/swr";
import { connectDeviceAction } from "../../providers/actions/connect-device";
import { disconnectDeviceAction } from "../../providers/actions/disconnect-device";
import { useAction } from "next-safe-action/hooks";
import { useKontak } from "@/app/providers/kontak-providers";

export const columns: ColumnDef<KontakClient>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => <div className="capitalize">{row.getValue("name")}</div>,
  },
  {
    accessorKey: "whatsapp_number",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Whatsapp Number
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="lowercase">{row.getValue("whatsapp_number")}</div>
    ),
  },
  {
    accessorKey: "status",
    header: () => <div className="text-right">Status</div>,
    cell: ({ row }) => {
      const client = row.original;
      const { data, isLoading } = useSWR<ConnectionStatusResponse>(
        `/api/kontak/status?clientId=${client.id}`,
        fetcher,
        {
          refreshInterval: 30000,
        }
      );
      if (isLoading) return <div>Loading...</div>;
      return (
        <div className="text-right font-medium">
          {data?.is_connected ? (
            <Badge variant="outline">
              <span className="w-2 h-2 rounded-full bg-green-500 mr-2" />
              Connected
            </Badge>
          ) : (
            <Badge variant="outline">
              <span className="w-2 h-2 rounded-full bg-red-500 mr-2" />
              Disconnected
            </Badge>
          )}
        </div>
      );
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const client = row.original;

      const { connectDevice, disconnectDevice, isConnecting, isDisconnecting } =
        useKontak();

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link
                href={`/clients/qr/${client.id}`}
                className="cursor-pointer"
              >
                QR Pairing
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/api-key/`} className="cursor-pointer">
                API Key
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />

            <DropdownMenuItem asChild>
              <Link
                href={`#`}
                className="cursor-pointer"
                onClick={async (ev) => {
                  ev.preventDefault();
                  await connectDevice(client.id);
                }}
              >
                {isConnecting ? "Connecting..." : "Connect"}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                href={`#`}
                className="cursor-pointer"
                onClick={async (evt) => {
                  evt.preventDefault();
                  await disconnectDevice(client.id);
                }}
              >
                {isDisconnecting ? "Disconnecting..." : "Disconnect"}
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
