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
const login = async (email: string, password: string) => {
  try {
    const response = await fetch(`${DEFAULT_BASE_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
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
  const response = await fetchWithAuth(DEFAULT_BASE_URL, "/admin/users", {
    method: "POST",
    body: JSON.stringify(userData),
  });
  return response.json();
};

const generateAPIKey = async () => {
  const response = await fetchWithAuth(
    DEFAULT_BASE_URL,
    "/admin/users/api-key",
    {
      method: "POST",
    }
  );
  return response.json();
};

const registerDevice = async (deviceData: any) => {
  const response = await fetchWithAuth(DEFAULT_BASE_URL, "/admin/clients", {
    method: "POST",
    body: JSON.stringify(deviceData),
  });
  return response.json();
};

const getDevices = async () => {
  const response = await fetchWithAuth(DEFAULT_BASE_URL, "/admin/clients");

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
};

const connectDevice = async (clientId: string) => {
  const response = await fetchWithAuth(
    DEFAULT_BASE_URL,
    `/admin/clients/${clientId}/connect`,
    {
      method: "POST",
    }
  );
  return response.json();
};

const disconnectDevice = async (clientId: string) => {
  const response = await fetchWithAuth(
    DEFAULT_BASE_URL,
    `/admin/clients/${clientId}/disconnect`,
    {
      method: "DELETE",
    }
  );
  return response.json();
};

const getClientQRC = async (clientId: string) => {
  const response = await fetchWithAuth(
    DEFAULT_BASE_URL,
    `/admin/clients/${clientId}/qr`
  );
  return response.json();
};

const getConnectionStatus = async (clientId: string) => {
  const response = await fetchWithAuth(
    DEFAULT_BASE_URL,
    `/admin/clients/${clientId}/status`
  );
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
};

export { kontakClient };
