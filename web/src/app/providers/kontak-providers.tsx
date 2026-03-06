"use client";

import React, { createContext, useContext, useState, useMemo, useCallback } from "react";
import { Toaster } from "@/components/ui/toaster";
import { toast } from "sonner";

interface APIKeyData {
  ID: string;
  Name: string;
  KeyPrefix: string;
  CreatedAt: string;
  LastUsedAt: string;
  IsActive: boolean;
  APIKey?: string;
}

interface APIKeyResponse {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string;
  is_active: boolean;
  api_key?: string;
}

function mapAPIKeyResponse(data: APIKeyResponse[]): APIKeyData[] {
  return data.map((key) => ({
    ID: key.id,
    Name: key.name,
    KeyPrefix: key.key_prefix,
    CreatedAt: key.created_at,
    LastUsedAt: key.last_used_at,
    IsActive: key.is_active,
    APIKey: key.api_key,
  }));
}

interface KontakContextProps {
  connectDevice: (clientId: string) => Promise<void>;
  disconnectDevice: (clientId: string) => Promise<void>;
  generateAPIKey: () => Promise<void>;
  apiKey: string;
  getConnectionStatus: (clientId: string) => Promise<string>;
  getDevices: () => Promise<any>;
  isGeneratingAPIKey: boolean;
  isConnecting: boolean;
  isDisconnecting: boolean;
  getAPIKeys: () => Promise<APIKeyData[]>;
  createAPIKey: (name: string) => Promise<APIKeyData>;
  deleteAPIKey: (id: string) => Promise<void>;
  apiKeys: APIKeyData[];
  refreshAPIKeys: () => Promise<void>;
}

const KontakContext = createContext<KontakContextProps | undefined>(undefined);

export const KontakProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [apiKey, setApiKey] = useState<string>("");
  const [apiKeys, setApiKeys] = useState<APIKeyData[]>([]);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isDisconnecting, setIsDisconnecting] = useState<boolean>(false);
  const [isGeneratingAPIKey, setIsGeneratingAPIKey] = useState<boolean>(false);

  const connectDevice = useCallback(async (clientId: string) => {
    setIsConnecting(true);
    try {
      const response = await fetch(`/api/kontak/connect?clientId=${clientId}`, {
        method: "POST",
      });

      if (!response.ok) {
        toast.error("Failed to connect device");
      } else {
        const data = await response.json();
        if (data.server_error) {
          toast.error(data.server_error);
        } else {
          toast.success("Device connected");
        }
      }
    } catch (error) {
      console.error("Failed to connect device:", error);
      toast.error(" Failed to connect device");
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnectDevice = useCallback(async (clientId: string) => {
    setIsDisconnecting(true);
    try {
      const response = await fetch(
        `/api/kontak/disconnect?clientId=${clientId}`,
        {
          method: "DELETE",
        }
      );
      if (!response.ok) {
        toast.error("Failed to disconnect device");
      } else {
        const data = await response.json();
        if (data.server_error) {
          toast.error(data.server_error);
        } else {
          toast.success("Device disconnected");
        }
      }
    } catch (error) {
      console.error("Failed to disconnect device:", error);
      toast.error("Failed to disconnect device");
    } finally {
      setIsDisconnecting(false);
    }
  }, []);

  const generateAPIKey = useCallback(async () => {
    setIsGeneratingAPIKey(true);
    try {
      const response = await fetch(`/api/kontak/api-key`, {
        method: "POST",
      });
      if (!response.ok) {
        toast.error("Failed to generate API key");
      } else {
        const data = await response.json();
        if (data.api_key) {
          setApiKey(data.api_key);
          toast.success("API key generated");
        } else {
          toast.error("Failed to generate API key");
        }
      }
    } catch (error) {
      console.error("Failed to generate API key:", error);
      toast.error("Failed to generate API key");
    } finally {
      setIsGeneratingAPIKey(false);
    }
  }, []);

  const getConnectionStatus = useCallback(async (clientId: string) => {
    try {
      const response = await fetch(`/api/kontak/status?clientId=${clientId}`, {
        method: "GET",
      });
      if (!response.ok) {
        toast.error("Failed to get connection status");
      } else {
        const data = await response.json();
        if (data.status) {
          return data.status;
        } else {
          toast.error("Failed to get connection status");
        }
      }
    } catch (error) {
      console.error("Failed to get connection status:", error);
      throw error;
    }
  }, []);

  const getDevices = useCallback(async () => {
    try {
      const response = await fetch(`/api/kontak/devices`, {
        method: "GET",
      });
      if (!response.ok) {
        toast.error("Failed to get devices");
      } else {
        const data = await response.json();
        return data;
      }
    } catch (error) {
      console.error("Failed to get devices:", error);
      throw error;
    }
  }, []);

  const refreshAPIKeys = useCallback(async () => {
    try {
      const response = await fetch(`/api/kontak/api-keys`, {
        method: "GET",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch API keys");
      }
      const data: APIKeyResponse[] = await response.json();
      setApiKeys(mapAPIKeyResponse(data));
    } catch (error) {
      console.error("Failed to fetch API keys:", error);
    }
  }, []);

  const getAPIKeys = useCallback(async (): Promise<APIKeyData[]> => {
    try {
      const response = await fetch(`/api/kontak/api-keys`, {
        method: "GET",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch API keys");
      }
      const data: APIKeyResponse[] = await response.json();
      const mapped = mapAPIKeyResponse(data);
      console.log("getAPIKeys mapped:", mapped);
      setApiKeys(mapped);
      return mapped;
    } catch (error) {
      console.error("Failed to fetch API keys:", error);
      return [];
    }
  }, []);

  const createAPIKey = useCallback(async (name: string): Promise<APIKeyData> => {
    setIsGeneratingAPIKey(true);
    try {
      const response = await fetch(`/api/kontak/api-keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create API key");
      }
      const data: APIKeyResponse = await response.json();
      await refreshAPIKeys();
      const mapped: APIKeyData = {
        ID: data.id,
        Name: data.name,
        KeyPrefix: data.key_prefix,
        CreatedAt: data.created_at,
        LastUsedAt: data.last_used_at,
        IsActive: data.is_active,
        APIKey: data.api_key,
      };
      if (data.api_key) {
        setApiKey(data.api_key);
      }
      toast.success("API key created");
      return mapped;
    } catch (error: any) {
      toast.error(error.message || "Failed to create API key");
      throw error;
    } finally {
      setIsGeneratingAPIKey(false);
    }
  }, [refreshAPIKeys]);

  const deleteAPIKey = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/kontak/api-keys/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Delete API key failed:", response.status, errorData);
        throw new Error(errorData.error || `Failed to delete API key (${response.status})`);
      }
      await refreshAPIKeys();
      toast.success("API key deleted");
    } catch (error: any) {
      console.error("Failed to delete API key:", error);
      toast.error(error.message || "Failed to delete API key");
      throw error;
    }
  }, [refreshAPIKeys]);

  const value = useMemo(
    () => ({
      disconnectDevice,
      generateAPIKey,
      apiKey,
      apiKeys,
      getConnectionStatus,
      getDevices,
      isConnecting,
      isDisconnecting,
      isGeneratingAPIKey,
      connectDevice,
      getAPIKeys,
      createAPIKey,
      deleteAPIKey,
      refreshAPIKeys,
    }),
    [
      disconnectDevice,
      generateAPIKey,
      apiKey,
      apiKeys,
      getConnectionStatus,
      getDevices,
      isConnecting,
      isDisconnecting,
      isGeneratingAPIKey,
      connectDevice,
      getAPIKeys,
      createAPIKey,
      deleteAPIKey,
      refreshAPIKeys,
    ]
  );

  return (
    <KontakContext.Provider value={value}>
      {children}
      <Toaster />
    </KontakContext.Provider>
  );
};

export const useKontak = () => {
  const context = useContext(KontakContext);
  if (context === undefined) {
    throw new Error("useKontak must be used within a KontakProvider");
  }
  return context;
};
