import { auth } from "@/auth";
import * as sdk from "@/types/generated/sdk.gen";
import type {
  GetAdminClientsResponse,
  PostAdminClientsResponse,
  PostAdminTemplatesResponse,
  PutAdminTemplatesByIdResponse,
  GetAdminTemplatesResponse,
  GetAdminUsersApiKeysResponse,
  PostAdminUsersApiKeysResponse,
  DeleteAdminUsersApiKeysByIdResponse,
  GetAdminInboxByClientIdThreadsResponse,
  GetAdminInboxByClientIdThreadsByChatJidMessagesResponse,
  PostAdminInboxByClientIdThreadsByChatJidSendResponse,
  GetAdminClientsByClientIdQrResponse,
  GetAdminClientsByClientIdStatusResponse,
  PostAdminClientsByClientIdConnectResponse,
  DeleteAdminClientsByClientIdDisconnectResponse,
  GetAdminContactsByClientIdResponse,
  GetAdminGroupsByClientIdResponse,
  GetAdminBroadcastsResponse,
  GetAdminBroadcastsByIdResponse,
  PostAdminBroadcastsResponse,
  PostAdminUsersApiKeyResponse,
} from "@/types/generated/types.gen";

const DEFAULT_BASE_URL = process.env.KONTAK_API_URL ?? "http://localhost:8080";

const getAuthHeaders = async (): Promise<Record<string, string>> => {
  let session: any;
  if (typeof window !== "undefined") {
    const { getSession } = await import("next-auth/react");
    session = await getSession();
  } else {
    session = await auth();
  }
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }
  return headers;
};

const BASE_URL = DEFAULT_BASE_URL.replace(/\/v1\/?$/, "");

const fetchWithAuth = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  const url = `${BASE_URL}${endpoint}`;
  const headers = await getAuthHeaders();
  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response;
};

const login = async (username: string, password: string) => {
  try {
    console.log("[kontak] Login attempt for:", username);
    const result = await sdk.postLogin({
      body: { email: username, password },
    });
    console.log("[kontak] Login result:", result);
    console.log("[kontak] Login result.data:", result?.data);
    return result?.data;
  } catch (error) {
    console.error("[kontak] Login failed:", error);
    throw error;
  }
};

const registerUser = async (userData: any) => {
  const response = await fetchWithAuth("/admin/users", {
    method: "POST",
    body: JSON.stringify(userData),
  });
  return response.json();
};

const generateAPIKey = async () => {
  const headers = await getAuthHeaders();
  const result = await sdk.postAdminUsersApiKey({ headers });
  return result.data as PostAdminUsersApiKeyResponse;
};

const getAPIKeys = async () => {
  const headers = await getAuthHeaders();
  const result = await sdk.getAdminUsersApiKeys({ headers });
  return (result.data as GetAdminUsersApiKeysResponse) ?? [];
};

const createAPIKey = async (name: string) => {
  const headers = await getAuthHeaders();
  const result = await sdk.postAdminUsersApiKeys({
    body: { name },
    headers,
  });
  return result.data as PostAdminUsersApiKeysResponse;
};

const deleteAPIKey = async (id: string) => {
  if (!id || id === "undefined" || id === "null") {
    throw new Error("Invalid API key ID");
  }
  const headers = await getAuthHeaders();
  const result = await sdk.deleteAdminUsersApiKeysById({
    path: { id },
    headers,
  });
  return result.data as DeleteAdminUsersApiKeysByIdResponse;
};

const registerDevice = async (deviceData: any) => {
  const headers = await getAuthHeaders();
  const result = await sdk.postAdminClients({
    body: deviceData,
    headers,
  });
  return result.data as PostAdminClientsResponse;
};

const getDevices = async () => {
  const headers = await getAuthHeaders();
  const result = await sdk.getAdminClients({ headers });
  return (result.data as GetAdminClientsResponse) ?? [];
};

const connectDevice = async (clientId: string) => {
  const headers = await getAuthHeaders();
  const result = await sdk.postAdminClientsByClientIdConnect({
    path: { client_id: clientId },
    headers,
  });
  return result.data as PostAdminClientsByClientIdConnectResponse;
};

const disconnectDevice = async (clientId: string) => {
  const headers = await getAuthHeaders();
  const result = await sdk.deleteAdminClientsByClientIdDisconnect({
    path: { client_id: clientId },
    headers,
  });
  return result.data as DeleteAdminClientsByClientIdDisconnectResponse;
};

const getClientQRC = async (clientId: string) => {
  const headers = await getAuthHeaders();
  const result = await sdk.getAdminClientsByClientIdQr({
    path: { client_id: clientId },
    headers,
  });
  return result.data as GetAdminClientsByClientIdQrResponse;
};

const getConnectionStatus = async (clientId: string) => {
  const headers = await getAuthHeaders();
  const result = await sdk.getAdminClientsByClientIdStatus({
    path: { client_id: clientId },
    headers,
  });
  return result.data as GetAdminClientsByClientIdStatusResponse;
};

const getContacts = async (clientId: string) => {
  const headers = await getAuthHeaders();
  const result = await sdk.getAdminContactsByClientId({
    path: { client_id: clientId },
    headers,
  });
  return (result.data as GetAdminContactsByClientIdResponse) ?? [];
};

const syncContacts = async (clientId: string) => {
  const headers = await getAuthHeaders();
  const result = await sdk.putAdminContactsByClientIdSync({
    path: { client_id: clientId },
    headers,
  });
  return result.data;
};

const getGroups = async (clientId: string) => {
  const headers = await getAuthHeaders();
  const result = await sdk.getAdminGroupsByClientId({
    path: { client_id: clientId },
    headers,
  });
  return (result.data as GetAdminGroupsByClientIdResponse) ?? [];
};

const syncGroups = async (clientId: string) => {
  const headers = await getAuthHeaders();
  const result = await sdk.putAdminGroupsByClientIdSync({
    path: { client_id: clientId },
    headers,
  });
  return result.data;
};

function parseVariables(variables: unknown): string[] {
  if (Array.isArray(variables)) return variables;
  if (typeof variables === "string") {
    try {
      const decoded = JSON.parse(atob(variables));
      return Array.isArray(decoded) ? decoded : [];
    } catch {
      try {
        const parsed = JSON.parse(variables);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
  }
  return [];
}

function normalizeTemplate(t: any) {
  return { ...t, variables: parseVariables(t.variables) };
}

const getTemplates = async () => {
  const headers = await getAuthHeaders();
  const result = await sdk.getAdminTemplates({ headers });
  const data = (result.data as GetAdminTemplatesResponse) ?? [];
  return Array.isArray(data) ? data.map(normalizeTemplate) : data;
};

const createTemplate = async (data: {
  name: string;
  content: string;
  variables: string[];
}) => {
  const headers = await getAuthHeaders();
  const result = await sdk.postAdminTemplates({
    body: { ...data, variables: data.variables },
    headers,
  });
  return normalizeTemplate((result.data as PostAdminTemplatesResponse) ?? {});
};

const updateTemplate = async (
  id: string,
  data: { name: string; content: string; variables: string[] }
) => {
  const headers = await getAuthHeaders();
  const result = await sdk.putAdminTemplatesById({
    path: { id },
    body: { ...data, variables: data.variables },
    headers,
  });
  return normalizeTemplate((result.data as PutAdminTemplatesByIdResponse) ?? {});
};

const deleteTemplate = async (id: string) => {
  const headers = await getAuthHeaders();
  const result = await sdk.deleteAdminTemplatesById({
    path: { id },
    headers,
  });
  return result.data;
};

const getThreads = async (
  clientId: string,
  params?: { limit?: number; offset?: number }
) => {
  const headers = await getAuthHeaders();
  const result = await sdk.getAdminInboxByClientIdThreads({
    path: { client_id: clientId },
    query: params,
    headers,
  });
  return (result.data as GetAdminInboxByClientIdThreadsResponse) ?? [];
};

const getThreadMessages = async (
  clientId: string,
  chatJid: string,
  params?: { limit?: number; offset?: number }
) => {
  const headers = await getAuthHeaders();
  const result = await sdk.getAdminInboxByClientIdThreadsByChatJidMessages({
    path: { client_id: clientId, chat_jid: chatJid },
    query: params,
    headers,
  });
  return (
    (result.data as GetAdminInboxByClientIdThreadsByChatJidMessagesResponse) ?? []
  );
};

const sendInboxMessage = async (
  clientId: string,
  chatJid: string,
  text: string
) => {
  const headers = await getAuthHeaders();
  const result = await sdk.postAdminInboxByClientIdThreadsByChatJidSend({
    path: { client_id: clientId, chat_jid: chatJid },
    body: { text },
    headers,
  });
  return result.data as PostAdminInboxByClientIdThreadsByChatJidSendResponse;
};

const sendNewInboxMessage = async (
  clientId: string,
  to: string,
  text: string
) => {
  const headers = await getAuthHeaders();
  const result = await sdk.postAdminInboxByClientIdThreadsSend({
    path: { client_id: clientId },
    body: { to, text },
    headers,
  });
  return result.data;
};

const markThreadRead = async (clientId: string, chatJid: string) => {
  const headers = await getAuthHeaders();
  const result = await sdk.postAdminInboxByClientIdThreadsByChatJidRead({
    path: { client_id: clientId, chat_jid: chatJid },
    headers,
  });
  return result.data;
};

const getBroadcasts = async () => {
  const headers = await getAuthHeaders();
  const result = await sdk.getAdminBroadcasts({ headers });
  return (result.data as GetAdminBroadcastsResponse) ?? [];
};

const getBroadcastJob = async (id: string) => {
  const headers = await getAuthHeaders();
  const result = await sdk.getAdminBroadcastsById({
    path: { id },
    headers,
  });
  return result.data as GetAdminBroadcastsByIdResponse;
};

const createBroadcast = async (data: {
  device_id: string;
  name: string;
  content: string;
  message_type: string;
  cooldown: number;
  recipients: string[];
}) => {
  const headers = await getAuthHeaders();
  const result = await sdk.postAdminBroadcasts({
    body: data,
    headers,
  });
  return result.data as PostAdminBroadcastsResponse;
};

const kontakClient = {
  login: (username: string, password: string) => login(username, password),
  registerUser: (userData: any) => registerUser(userData),
  generateAPIKey: () => generateAPIKey(),
  getAPIKeys: () => getAPIKeys(),
  createAPIKey: (name: string) => createAPIKey(name),
  deleteAPIKey: (id: string) => deleteAPIKey(id),
  registerDevice: (deviceData: any) => registerDevice(deviceData),
  getDevices: () => getDevices(),
  connectDevice: (clientId: string) => connectDevice(clientId),
  disconnectDevice: (clientId: string) => disconnectDevice(clientId),
  getClientQRC: (clientId: string) => getClientQRC(clientId),
  getConnectionStatus: (clientId: string) => getConnectionStatus(clientId),
  getTemplates: () => getTemplates(),
  createTemplate: (data: {
    name: string;
    content: string;
    variables: string[];
  }) => createTemplate(data),
  updateTemplate: (
    id: string,
    data: { name: string; content: string; variables: string[] }
  ) => updateTemplate(id, data),
  deleteTemplate: (id: string) => deleteTemplate(id),
  getContacts: (clientId: string) => getContacts(clientId),
  syncContacts: (clientId: string) => syncContacts(clientId),
  getGroups: (clientId: string) => getGroups(clientId),
  syncGroups: (clientId: string) => syncGroups(clientId),
  getThreads: (clientId: string, params?: { limit?: number; offset?: number }) =>
    getThreads(clientId, params),
  getThreadMessages: (
    clientId: string,
    chatJid: string,
    params?: { limit?: number; offset?: number }
  ) => getThreadMessages(clientId, chatJid, params),
  sendInboxMessage: (clientId: string, chatJid: string, text: string) =>
    sendInboxMessage(clientId, chatJid, text),
  sendNewInboxMessage: (clientId: string, to: string, text: string) =>
    sendNewInboxMessage(clientId, to, text),
  markThreadRead: (clientId: string, chatJid: string) =>
    markThreadRead(clientId, chatJid),
  getBroadcasts: () => getBroadcasts(),
  getBroadcastJob: (id: string) => getBroadcastJob(id),
  createBroadcast: (data: any) => createBroadcast(data),
};

export { kontakClient };