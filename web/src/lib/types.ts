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

export type WhatsAppContact = {
  id: string;
  device_id: string;
  jid: string;
  full_name: string;
  push_name: string;
  business_name: string;
  phone_number: string;
  created_at: string;
  updated_at: string;
};

export type WhatsAppGroup = {
  id: string;
  device_id: string;
  group_id: string;
  group_name: string;
  group_description: string;
  participant_count: number;
  created_at: string;
  updated_at: string;
};

export type MessageTemplate = {
  id: string;
  user_id: number;
  name: string;
  content: string;
  variables: string[];
  created_at: string;
  updated_at: string;
};

export type MessageLog = {
  id: string;
  device_id: string;
  user_id: number | null;
  recipient: string;
  recipient_type: string;
  message_type: string;
  content: string;
  media_url: string | null;
  media_filename: string | null;
  status: string;
  direction: string;
  wa_message_id: string | null;
  sender_jid: string | null;
  sender_name: string | null;
  sent_at: string;
  delivered_at: string | null;
  read_at: string | null;
};

export type Conversation = {
  recipient: string;
  recipient_type: string;
  recipient_name: string | null;
  last_message_at: string;
  last_message_content: string;
  last_message_direction: string;
  unread_count: number;
};

export type MessageThread = {
  id: string;
  device_id: string;
  chat_jid: string;
  chat_type: string;
  chat_name: string;
  last_message_at: string;
  last_message_content: string;
  last_message_type: string;
  last_message_direction: string;
  unread_count: number;
};
