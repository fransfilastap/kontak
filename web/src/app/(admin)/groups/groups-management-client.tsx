"use client";

import { useState, useMemo } from "react";
import type { KontakClient, WhatsAppGroup } from "@/lib/types";
import {
  UsersIcon,
  SmartphoneIcon,
  SearchIcon,
  RefreshCwIcon,
  HashIcon,
  CrownIcon,
  MessageCircleIcon,
  MoreVerticalIcon,
  ArrowUpDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  UsersRoundIcon,
  XIcon,
  InfoIcon,
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
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import useSWR from "swr";
import fetcher from "@/lib/swr";

interface GroupsManagementClientProps {
  devices: KontakClient[];
}

type SortField = "name" | "participants" | "created_at";
type SortDirection = "asc" | "desc";

export function GroupsManagementClient({
  devices,
}: GroupsManagementClientProps) {
  const { toast } = useToast();
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<WhatsAppGroup | null>(null);
  const itemsPerPage = 10;

  const {
    data: groups,
    error,
    isLoading,
    mutate,
  } = useSWR<WhatsAppGroup[]>(
    selectedDeviceId ? `/api/kontak/groups/${selectedDeviceId}` : null,
    fetcher
  );

  const selectedDevice = useMemo(
    () => devices.find((d) => d.id === selectedDeviceId),
    [devices, selectedDeviceId]
  );

  const filteredGroups = useMemo(() => {
    if (!groups) return [];
    let filtered = groups;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = groups.filter(
        (group) =>
          group.group_name?.toLowerCase().includes(query) ||
          group.group_description?.toLowerCase().includes(query)
      );
    }

    filtered = [...filtered].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "name":
          comparison = (a.group_name || "").localeCompare(b.group_name || "");
          break;
        case "participants":
          comparison = (a.participant_count || 0) - (b.participant_count || 0);
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
  }, [groups, searchQuery, sortField, sortDirection]);

  const paginatedGroups = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredGroups.slice(start, start + itemsPerPage);
  }, [filteredGroups, currentPage]);

  const totalPages = Math.ceil(filteredGroups.length / itemsPerPage);

  const totalParticipants = useMemo(
    () => groups?.reduce((sum, g) => sum + (g.participant_count || 0), 0) || 0,
    [groups]
  );

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
        `/api/kontak/groups/${selectedDeviceId}/sync`,
        { method: "PUT" }
      );
      if (!response.ok) throw new Error("Sync failed");
      await mutate();
      toast({
        title: "Success",
        description: "Groups synced successfully",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to sync groups",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Groups</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage WhatsApp groups across your devices
          </p>
        </div>
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

      {/* Stats */}
      {groups && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Groups
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <HashIcon className="h-4 w-4 text-primary" />
                <span className="text-2xl font-bold">{groups.length}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <UsersRoundIcon className="h-4 w-4 text-blue-500" />
                <span className="text-2xl font-bold">
                  {totalParticipants.toLocaleString()}
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
            Choose a WhatsApp device to view and manage its groups
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
                    placeholder="Search groups..."
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
                  <div key={`skeleton-row-${i}`} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-lg" />
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
                  <CrownIcon className="h-6 w-6 text-destructive" />
                </div>
                <h3 className="font-semibold text-lg">Failed to load groups</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  There was an error fetching the groups
                </p>
                <Button variant="outline" className="mt-4" onClick={() => mutate()}>
                  <RefreshCwIcon className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            ) : !groups?.length ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  <UsersIcon className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-lg">No groups found</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Sync groups from your device to get started
                </p>
                <Button className="mt-4" onClick={handleSync} disabled={isSyncing}>
                  <RefreshCwIcon
                    className={`h-4 w-4 mr-2 ${isSyncing ? "animate-spin" : ""}`}
                  />
                  Sync Groups
                </Button>
              </div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead
                          className="cursor-pointer"
                          onClick={() => handleSort("name")}
                        >
                          <div className="flex items-center gap-1">
                            Group Name
                            <ArrowUpDownIcon className="h-3 w-3" />
                          </div>
                        </TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead
                          className="cursor-pointer"
                          onClick={() => handleSort("participants")}
                        >
                          <div className="flex items-center gap-1">
                            Members
                            <ArrowUpDownIcon className="h-3 w-3" />
                          </div>
                        </TableHead>
                        <TableHead>Group ID</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedGroups.map((group) => (
                        <TableRow
                          key={group.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setSelectedGroup(group)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                <UsersIcon className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <div className="font-medium">
                                  {group.group_name || "Unnamed Group"}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground line-clamp-1 max-w-[200px]">
                              {group.group_description || "No description"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="font-mono">
                                <UsersRoundIcon className="h-3 w-3 mr-1" />
                                {group.participant_count || 0}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground font-mono">
                              {group.group_id?.split("@")[0]?.slice(0, 15)}...
                            </span>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreVerticalIcon className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedGroup(group);
                                  }}
                                >
                                  <InfoIcon className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(group.group_id || "");
                                    toast({
                                      title: "Copied",
                                      description: "Group ID copied to clipboard",
                                    });
                                  }}
                                >
                                  <HashIcon className="h-4 w-4 mr-2" />
                                  Copy Group ID
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
                      {Math.min(currentPage * itemsPerPage, filteredGroups.length)} of{" "}
                      {filteredGroups.length} groups
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

      {/* Group Details Dialog */}
      <Dialog open={!!selectedGroup} onOpenChange={() => setSelectedGroup(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <UsersIcon className="h-4 w-4 text-primary" />
              </div>
              {selectedGroup?.group_name || "Group Details"}
            </DialogTitle>
            <DialogDescription>
              View detailed information about this WhatsApp group
            </DialogDescription>
          </DialogHeader>
          {selectedGroup && (
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Group Name
                  </label>
                  <p className="text-sm font-medium">
                    {selectedGroup.group_name || "N/A"}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Participants
                  </label>
                  <p className="text-sm font-medium">
                    <Badge variant="secondary">
                      <UsersRoundIcon className="h-3 w-3 mr-1" />
                      {selectedGroup.participant_count || 0} members
                    </Badge>
                  </p>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Description
                </label>
                <p className="text-sm bg-muted p-3 rounded-md min-h-[60px]">
                  {selectedGroup.group_description || "No description available"}
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Group ID
                </label>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-muted px-2 py-1 rounded flex-1 font-mono break-all">
                    {selectedGroup.group_id}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedGroup.group_id || "");
                      toast({
                        title: "Copied",
                        description: "Group ID copied to clipboard",
                      });
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Created
                  </label>
                  <p className="text-sm">
                    {selectedGroup.created_at
                      ? new Date(selectedGroup.created_at).toLocaleDateString()
                      : "N/A"}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Last Updated
                  </label>
                  <p className="text-sm">
                    {selectedGroup.updated_at
                      ? new Date(selectedGroup.updated_at).toLocaleDateString()
                      : "N/A"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
