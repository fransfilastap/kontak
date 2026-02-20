import { auth } from "@/auth";

const DEFAULT_BASE_URL = process.env.KONTAK_API_URL ?? "http://localhost:8080";

const getHeaders = async (): Promise<HeadersInit> => {
  let session;
  if (typeof window !== "undefined") {
    const { getSession } = await import("next-auth/react");
    session = await getSession();
  } else {
    session = await auth();
  }
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }
  return headers;
};

const fetchWithAuth = async (
  baseURL: string,
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  const url = `${baseURL}${endpoint}`;
  const headers = await getHeaders();
  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response;
};

// Auth
// Login and admin endpoints are at root level, not under /v1 which requires an API key
const BASE_URL = DEFAULT_BASE_URL.replace(/\/v1\/?$/, "");

const login = async (username: string, password: string) => {
  try {
    const response = await fetch(`${BASE_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: username, password }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    return data;
  } catch (error) {
    console.error("Login failed:", error);
    throw error;
  }
};

// Admin routes
const registerUser = async (userData: any) => {
  const response = await fetchWithAuth(BASE_URL, "/admin/users", {
    method: "POST",
    body: JSON.stringify(userData),
  });
  return response.json();
};

const generateAPIKey = async () => {
  const response = await fetchWithAuth(
    BASE_URL,
    "/admin/users/api-key",
    {
      method: "POST",
    }
  );
  return response.json();
};

const registerDevice = async (deviceData: any) => {
  const response = await fetchWithAuth(BASE_URL, "/admin/clients", {
    method: "POST",
    body: JSON.stringify(deviceData),
  });
  return response.json();
};

const getDevices = async () => {
  const response = await fetchWithAuth(BASE_URL, "/admin/clients");

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
};

const connectDevice = async (clientId: string) => {
  const response = await fetchWithAuth(
    BASE_URL,
    `/admin/clients/${clientId}/connect`,
    {
      method: "POST",
    }
  );
  return response.json();
};

const disconnectDevice = async (clientId: string) => {
  const response = await fetchWithAuth(
    BASE_URL,
    `/admin/clients/${clientId}/disconnect`,
    {
      method: "DELETE",
    }
  );
  return response.json();
};

const getClientQRC = async (clientId: string) => {
  const response = await fetchWithAuth(
    BASE_URL,
    `/admin/clients/${clientId}/qr`
  );
  return response.json();
};

const getConnectionStatus = async (clientId: string) => {
  const response = await fetchWithAuth(
    BASE_URL,
    `/admin/clients/${clientId}/status`
  );
  return response.json();
};

// Contacts
const getContacts = async (clientId: string) => {
  const response = await fetchWithAuth(BASE_URL, `/admin/contacts/${clientId}`);
  return response.json();
};

const syncContacts = async (clientId: string) => {
  const response = await fetchWithAuth(
    BASE_URL,
    `/admin/contacts/${clientId}/sync`,
    { method: "PUT" }
  );
  return response.json();
};

// Groups
const getGroups = async (clientId: string) => {
  const response = await fetchWithAuth(BASE_URL, `/admin/groups/${clientId}`);
  return response.json();
};

const syncGroups = async (clientId: string) => {
  const response = await fetchWithAuth(
    BASE_URL,
    `/admin/groups/${clientId}/sync`,
    { method: "PUT" }
  );
  return response.json();
};

// Message Templates
// Go serializes []byte as base64. Parse variables from base64 or pass through if already an array.
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
  const response = await fetchWithAuth(BASE_URL, "/admin/templates");
  const data = await response.json();
  return Array.isArray(data) ? data.map(normalizeTemplate) : data;
};

const createTemplate = async (data: {
  name: string;
  content: string;
  variables: string[];
}) => {
  const response = await fetchWithAuth(BASE_URL, "/admin/templates", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return normalizeTemplate(await response.json());
};

const updateTemplate = async (
  id: string,
  data: { name: string; content: string; variables: string[] }
) => {
  const response = await fetchWithAuth(BASE_URL, `/admin/templates/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return normalizeTemplate(await response.json());
};

const deleteTemplate = async (id: string) => {
  const response = await fetchWithAuth(BASE_URL, `/admin/templates/${id}`, {
    method: "DELETE",
  });
  return response.json();
};

// Inbox / Threads
const getThreads = async (clientId: string, params?: { limit?: number; offset?: number }) => {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.offset) searchParams.set("offset", String(params.offset));
  const qs = searchParams.toString();
  const response = await fetchWithAuth(BASE_URL, `/admin/inbox/${clientId}/threads${qs ? `?${qs}` : ""}`);
  return response.json();
};

const getThreadMessages = async (clientId: string, chatJid: string, params?: { limit?: number; offset?: number }) => {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.offset) searchParams.set("offset", String(params.offset));
  const qs = searchParams.toString();
  const response = await fetchWithAuth(BASE_URL, `/admin/inbox/${clientId}/threads/${encodeURIComponent(chatJid)}/messages${qs ? `?${qs}` : ""}`);
  return response.json();
};

const sendInboxMessage = async (clientId: string, chatJid: string, text: string) => {
  const response = await fetchWithAuth(BASE_URL, `/admin/inbox/${clientId}/threads/${encodeURIComponent(chatJid)}/send`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
  return response.json();
};

const sendNewInboxMessage = async (clientId: string, to: string, text: string) => {
  const response = await fetchWithAuth(BASE_URL, `/admin/inbox/${clientId}/threads/send`, {
    method: "POST",
    body: JSON.stringify({ to, text }),
  });
  return response.json();
};

const markThreadRead = async (clientId: string, chatJid: string) => {
  const response = await fetchWithAuth(BASE_URL, `/admin/inbox/${clientId}/threads/${encodeURIComponent(chatJid)}/read`, {
    method: "POST",
  });
  return response.json();
};

const kontakClient = {
  login: (username: string, password: string) => login(username, password),
  registerUser: (userData: any) => registerUser(userData),
  generateAPIKey: () => generateAPIKey(),
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
  getThreads: (clientId: string, params?: { limit?: number; offset?: number }) => getThreads(clientId, params),
  getThreadMessages: (clientId: string, chatJid: string, params?: { limit?: number; offset?: number }) => getThreadMessages(clientId, chatJid, params),
  sendInboxMessage: (clientId: string, chatJid: string, text: string) => sendInboxMessage(clientId, chatJid, text),
  sendNewInboxMessage: (clientId: string, to: string, text: string) => sendNewInboxMessage(clientId, to, text),
  markThreadRead: (clientId: string, chatJid: string) => markThreadRead(clientId, chatJid),
};

export { kontakClient };
