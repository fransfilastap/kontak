export type KontakClient = {
  id: string;
  name: string;
  whatsapp_number: string;
  jid: string;
  token: string;
  qr_code: string;
  is_connected: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string;
};

export type ConnectionStatusResponse = {
  is_connected: boolean;
};

export type QRCodeResponse = {
  is_connected: boolean;
  code: string;
};
