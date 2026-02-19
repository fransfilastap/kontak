"use client";

import { useState, useMemo } from "react";
import type { KontakClient, WhatsAppContact } from "@/lib/types";
import {
  UsersIcon,
  SmartphoneIcon,
  SearchIcon,
  RefreshCwIcon,
  MailIcon,
  UserIcon,
  DownloadIcon,
  MoreVerticalIcon,
  ArrowUpDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FilterIcon,
  XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import useSWR from "swr";
import fetcher from "@/lib/swr";

interface ContactsManagementClientProps {
  devices: KontakClient[];
}

type SortField = "name" | "phone" | "created_at";
type SortDirection = "asc" | "desc";

export function ContactsManagementClient({
  devices,
}: ContactsManagementClientProps) {
  const { toast } = useToast();
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [isSyncing, setIsSyncing] = useState(false);
  const itemsPerPage = 10;

  const {
    data: contacts,
    error,
    isLoading,
    mutate,
  } = useSWR<WhatsAppContact[]>(
    selectedDeviceId ? `/api/kontak/contacts/${selectedDeviceId}` : null,
    fetcher
  );

  const selectedDevice = useMemo(
    () => devices.find((d) => d.id === selectedDeviceId),
    [devices, selectedDeviceId]
  );

  const filteredContacts = useMemo(() => {
    if (!contacts) return [];
    let filtered = contacts;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = contacts.filter(
        (contact) =>
          contact.full_name?.toLowerCase().includes(query) ||
          contact.phone_number?.toLowerCase().includes(query) ||
          contact.push_name?.toLowerCase().includes(query) ||
          contact.business_name?.toLowerCase().includes(query)
      );
    }

    filtered = [...filtered].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "name":
          comparison = (a.full_name || "").localeCompare(b.full_name || "");
          break;
        case "phone":
          comparison = (a.phone_number || "").localeCompare(
            b.phone_number || ""
          );
          break;
        case "created_at":
          comparison =
            new Date(a.created_at || 0).getTime() -
            new Date(b.created_at || 0).getTime();
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [contacts, searchQuery, sortField, sortDirection]);

  const paginatedContacts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredContacts.slice(start, start + itemsPerPage);
  }, [filteredContacts, currentPage]);

  const totalPages = Math.ceil(filteredContacts.length / itemsPerPage);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const handleSync = async () => {
    if (!selectedDeviceId) return;
    setIsSyncing(true);
    try {
      const response = await fetch(
        `/api/kontak/contacts/${selectedDeviceId}/sync`,
        { method: "PUT" }
      );
      if (!response.ok) throw new Error("Sync failed");
      await mutate();
      toast({
        title: "Success",
        description: "Contacts synced successfully",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to sync contacts",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExport = () => {
    if (!contacts) return;
    const csvContent = [
      ["Name", "Phone Number", "Push Name", "Business Name"],
      ...contacts.map((c) => [
        c.full_name || "",
        c.phone_number || "",
        c.push_name || "",
        c.business_name || "",
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contacts-${selectedDevice?.name || "export"}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getInitials = (name: string) => {
    return name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";
  };

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contacts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage contacts across your WhatsApp devices
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={!contacts?.length}
          >
            <DownloadIcon className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            onClick={handleSync}
            disabled={!selectedDeviceId || isSyncing || isLoading}
          >
            <RefreshCwIcon
              className={`h-4 w-4 mr-2 ${isSyncing ? "animate-spin" : ""}`}
            />
            {isSyncing ? "Syncing..." : "Sync"}
          </Button>
        </div>
      </div>

      {/* Stats */}
      {contacts && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Contacts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <UsersIcon className="h-4 w-4 text-primary" />
                <span className="text-2xl font-bold">{contacts.length}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Filtered
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <FilterIcon className="h-4 w-4 text-blue-500" />
                <span className="text-2xl font-bold">
                  {filteredContacts.length}
                </span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Device
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <SmartphoneIcon className="h-4 w-4 text-emerald-500" />
                <span className="text-lg font-medium truncate">
                  {selectedDevice?.name || "Select device"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Device Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Device</CardTitle>
          <CardDescription>
            Choose a WhatsApp device to view and manage its contacts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedDeviceId}
            onValueChange={(value) => {
              setSelectedDeviceId(value);
              setCurrentPage(1);
              setSearchQuery("");
            }}
          >
            <SelectTrigger className="w-full sm:w-[400px]">
              <SelectValue placeholder="Select a device..." />
            </SelectTrigger>
            <SelectContent>
              {devices.map((device) => (
                <SelectItem key={device.id} value={device.id}>
                  <div className="flex items-center gap-2">
                    <SmartphoneIcon className="h-4 w-4" />
                    <span>{device.name}</span>
                    {device.is_connected && (
                      <Badge
                        variant="secondary"
                        className="ml-2 bg-emerald-100 text-emerald-700"
                      >
                        Connected
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Search and Table */}
      {selectedDeviceId && (
        <Card>
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                <div className="relative flex-1 max-w-md">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search contacts..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-9"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                      onClick={() => setSearchQuery("")}
                    >
                      <XIcon className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={`skeleton-row-${Date.now()}-${i}`} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-[250px]" />
                      <Skeleton className="h-3 w-[150px]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                  <MailIcon className="h-6 w-6 text-destructive" />
                </div>
                <h3 className="font-semibold text-lg">Failed to load contacts</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  There was an error fetching the contacts
                </p>
                <Button variant="outline" className="mt-4" onClick={() => mutate()}>
                  <RefreshCwIcon className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            ) : !contacts?.length ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  <UsersIcon className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-lg">No contacts found</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Sync contacts from your device to get started
                </p>
                <Button className="mt-4" onClick={handleSync} disabled={isSyncing}>
                  <RefreshCwIcon
                    className={`h-4 w-4 mr-2 ${isSyncing ? "animate-spin" : ""}`}
                  />
                  Sync Contacts
                </Button>
              </div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]"></TableHead>
                        <TableHead
                          className="cursor-pointer"
                          onClick={() => handleSort("name")}
                        >
                          <div className="flex items-center gap-1">
                            Name
                            <ArrowUpDownIcon className="h-3 w-3" />
                          </div>
                        </TableHead>
                        <TableHead
                          className="cursor-pointer"
                          onClick={() => handleSort("phone")}
                        >
                          <div className="flex items-center gap-1">
                            Phone Number
                            <ArrowUpDownIcon className="h-3 w-3" />
                          </div>
                        </TableHead>
                        <TableHead>Push Name</TableHead>
                        <TableHead>Business</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedContacts.map((contact) => (
                        <TableRow key={contact.id}>
                          <TableCell>
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                {getInitials(contact.full_name || contact.push_name)}
                              </AvatarFallback>
                            </Avatar>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {contact.full_name || contact.push_name || "Unknown"}
                            </div>
                            {contact.full_name && contact.push_name && (
                              <div className="text-xs text-muted-foreground">
                                {contact.push_name}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm">
                                {contact.phone_number || "N/A"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {contact.push_name || "—"}
                            </span>
                          </TableCell>
                          <TableCell>
                            {contact.business_name ? (
                              <Badge variant="secondary" className="text-xs">
                                {contact.business_name}
                              </Badge>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVerticalIcon className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() =>
                                    navigator.clipboard.writeText(contact.phone_number || "")
                                  }
                                >
                                  Copy phone number
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    navigator.clipboard.writeText(contact.jid || "")
                                  }
                                >
                                  Copy JID
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                      {Math.min(currentPage * itemsPerPage, filteredContacts.length)} of{" "}
                      {filteredContacts.length} contacts
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeftIcon className="h-4 w-4" />
                      </Button>
                      <span className="text-sm">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPage((p) => Math.min(totalPages, p + 1))
                        }
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRightIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
