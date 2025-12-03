// Database types generated from Supabase schema

export type PresenceStatus = 'online' | 'away' | 'busy' | 'appear_offline' | 'offline';
export type ContactStatus = 'pending' | 'accepted' | 'blocked';
export type ConversationType = 'one_on_one' | 'group';
export type MessageType = 'text' | 'file' | 'system' | 'image' | 'voice' | 'wink';
export type UploadStatus = 'pending' | 'completed' | 'failed';

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          username: string;
          display_name: string | null;
          personal_message: string | null;
          display_picture_url: string | null;
          presence_status: PresenceStatus;
          last_seen: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          username: string;
          display_name?: string | null;
          personal_message?: string | null;
          display_picture_url?: string | null;
          presence_status?: PresenceStatus;
          last_seen?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          username?: string;
          display_name?: string | null;
          personal_message?: string | null;
          display_picture_url?: string | null;
          presence_status?: PresenceStatus;
          last_seen?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      contacts: {
        Row: {
          id: string;
          user_id: string;
          contact_user_id: string;
          status: ContactStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          contact_user_id: string;
          status?: ContactStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          contact_user_id?: string;
          status?: ContactStatus;
          created_at?: string;
        };
      };
      conversations: {
        Row: {
          id: string;
          type: ConversationType;
          name: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          type: ConversationType;
          name?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          type?: ConversationType;
          name?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      conversation_participants: {
        Row: {
          id: string;
          conversation_id: string;
          user_id: string;
          joined_at: string;
          left_at: string | null;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          user_id: string;
          joined_at?: string;
          left_at?: string | null;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          user_id?: string;
          joined_at?: string;
          left_at?: string | null;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          message_type: MessageType;
          metadata: Record<string, any>;
          created_at: string;
          delivered_at: string | null;
          read_at: string | null;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          message_type?: MessageType;
          metadata?: Record<string, any>;
          created_at?: string;
          delivered_at?: string | null;
          read_at?: string | null;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string;
          content?: string;
          message_type?: MessageType;
          metadata?: Record<string, any>;
          created_at?: string;
          delivered_at?: string | null;
          read_at?: string | null;
        };
      };
      ai_conversations: {
        Row: {
          id: string;
          user_id: string;
          chatbot_type: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          chatbot_type: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          chatbot_type?: string;
          created_at?: string;
        };
      };
      files: {
        Row: {
          id: string;
          message_id: string;
          filename: string;
          file_size: number;
          mime_type: string;
          storage_path: string;
          upload_status: UploadStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          message_id: string;
          filename: string;
          file_size: number;
          mime_type: string;
          storage_path: string;
          upload_status?: UploadStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          message_id?: string;
          filename?: string;
          file_size?: number;
          mime_type?: string;
          storage_path?: string;
          upload_status?: UploadStatus;
          created_at?: string;
        };
      };
    };
  };
}
