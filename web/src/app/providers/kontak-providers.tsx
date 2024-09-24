"use client";

import React, { createContext, useContext, useState, useMemo } from "react";
import { Toaster } from "@/components/ui/toaster";
import { toast } from "sonner";

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
}

const KontakContext = createContext<KontakContextProps | undefined>(undefined);

export const KontakProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [apiKey, setApiKey] = useState<string>("");
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isDisconnecting, setIsDisconnecting] = useState<boolean>(false);
  const [isGeneratingAPIKey, setIsGeneratingAPIKey] = useState<boolean>(false);
  const connectDevice = async (clientId: string) => {
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
  };

  const disconnectDevice = async (clientId: string) => {
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
  };

  const generateAPIKey = async () => {
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
    }
  };

  const getConnectionStatus = async (clientId: string) => {
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
  };

  const getDevices = async () => {
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
  };

  const value = useMemo(
    () => ({
      disconnectDevice,
      generateAPIKey,
      apiKey,
      getConnectionStatus,
      getDevices,
      isConnecting,
      isDisconnecting,
      isGeneratingAPIKey,
      connectDevice,
    }),
    [
      disconnectDevice,
      generateAPIKey,
      apiKey,
      getConnectionStatus,
      getDevices,
      isConnecting,
      isDisconnecting,
      isGeneratingAPIKey,
      connectDevice,
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
