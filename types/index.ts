export interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  is_online: boolean;
  last_seen: string;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  created_by: string | null;
  is_direct_message: boolean;
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  group_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  users?: User;
}

export interface Message {
  id: string;
  group_id: string;
  sender_id: string | null;
  content: string | null;
  message_type: 'text' | 'image' | 'file' | 'system' | 'audio';
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  reply_to: string | null;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
  sender?: User;
  reply_message?: Message;
}

export interface ReadReceipt {
  user_id: string;
  group_id: string;
  last_read_message_id: string | null;
  last_read_at: string;
}

export interface GroupWithLastMessage extends Group {
  last_message?: Message;
  unread_count?: number;
  members?: GroupMember[];
}
